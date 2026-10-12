-- Votes, stakes, cash-out and the hunted-note comment cascade run inside Postgres, one call each,
-- with the same rules the apps apply today. Each call succeeds or fails as a whole.
-- Safe to re-run. Hunt and ascent payout math stays in the settle functions, unchanged.

alter table public.votes add column if not exists health_at_vote integer;
alter table public.comment_votes add column if not exists health_at_vote integer;
alter table public.hp_transactions add column if not exists comment_id uuid;
alter table public.research_posts add column if not exists original_stake integer;
alter table public.research_posts add column if not exists unlock_rate_multiple integer;

create index if not exists hp_transactions_user_post_type_comment_idx
  on public.hp_transactions (user_id, post_id, type, comment_id);

create or replace function public.laniakea_note_access(p_viewer uuid, p_post uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer_tier text;
  v_viewer_role text;
  v_author_tier text;
  v_viewer_rank integer;
  v_author_rank integer;
begin
  select tier, role
  into v_viewer_tier, v_viewer_role
  from public.profiles
  where id = p_viewer;

  if v_viewer_role = 'admin' then
    return 'full';
  end if;

  select a.tier
  into v_author_tier
  from public.research_posts p
  join public.profiles a on a.id = p.author_id
  where p.id = p_post;

  if v_author_tier is null then
    return 'full';
  end if;

  v_viewer_rank := public.tier_rank(v_viewer_tier);
  v_author_rank := public.tier_rank(v_author_tier);

  if v_author_rank <= v_viewer_rank then
    return 'full';
  end if;

  if exists (
    select 1
    from public.post_unlocks
    where user_id = p_viewer
      and post_id = p_post
  ) then
    return 'full';
  end if;

  if v_author_rank = v_viewer_rank + 1 then
    return 'view_only';
  end if;

  return 'hidden';
end;
$$;

create or replace function public.laniakea_spend_hp(p_user uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hp integer;
begin
  select current_hp
  into v_hp
  from public.profiles
  where id = p_user
  for update;

  if not found then
    raise exception 'Profile was not found.';
  end if;

  if v_hp < p_amount then
    raise exception 'Insufficient HP. Need %, have %.', p_amount, v_hp;
  end if;

  update public.profiles
  set
    current_hp = current_hp - p_amount,
    updated_at = now()
  where id = p_user;

  return v_hp - p_amount;
end;
$$;

create or replace function public.laniakea_track_topic(p_user uuid, p_topic text, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_topic is null or btrim(p_topic) = '' then
    return;
  end if;

  begin
    insert into public.subtopic_ranks (user_id, sub_topic, tier, current_hp, updated_at)
    values (p_user, p_topic, 'Bronze', greatest(p_delta, 0), now())
    on conflict (user_id, sub_topic) do update
    set
      current_hp = public.subtopic_ranks.current_hp + p_delta,
      updated_at = now();
  exception
    when check_violation or foreign_key_violation then
      null;
  end;
end;
$$;

create or replace function public.laniakea_refund(
  p_user uuid,
  p_amount integer,
  p_post uuid,
  p_comment uuid,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    return;
  end if;

  if exists (
    select 1
    from public.hp_transactions
    where user_id = p_user
      and post_id = p_post
      and comment_id is not distinct from p_comment
      and type = 'refund'
      and description = p_description
  ) then
    return;
  end if;

  perform public.laniakea_increment_hp(p_user, p_amount);

  insert into public.hp_transactions (user_id, amount, type, post_id, comment_id, description)
  values (p_user, p_amount, 'refund', p_post, p_comment, p_description);
end;
$$;

create or replace function public.settle_comments_on_hunted_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  c record;
  v record;
  v_settled integer := 0;
  v_refunded integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select status
  into v_status
  from public.research_posts
  where id = p_post_id;

  if not found then
    raise exception 'Post not found';
  end if;

  if v_status is distinct from 'archived' then
    raise exception 'Post is not hunted';
  end if;

  for c in
    select id, author_id, current_health, original_stake
    from public.research_comments
    where post_id = p_post_id
      and status = 'live'
    order by created_at
    for update
  loop
    if c.current_health < c.original_stake then
      update public.research_comments
      set
        status = 'archived',
        current_health = 0,
        updated_at = now()
      where id = c.id;

      perform public.settle_hunted_comment(c.id, p_post_id);
      v_settled := v_settled + 1;
    else
      for v in
        select user_id, value
        from public.comment_votes
        where comment_id = c.id
        order by created_at
      loop
        perform public.laniakea_refund(
          v.user_id,
          abs(v.value),
          p_post_id,
          c.id,
          'Vote refund on comment ' || c.id || ' (parent hunted)'
        );
      end loop;

      if c.original_stake > 0 then
        perform public.laniakea_refund(
          c.author_id,
          c.original_stake,
          p_post_id,
          c.id,
          'Stake refund on comment ' || c.id || ' (parent hunted)'
        );
      end if;

      update public.research_comments
      set
        status = 'refunded',
        updated_at = now()
      where id = c.id;

      v_refunded := v_refunded + 1;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'settled', v_settled, 'refunded', v_refunded);
end;
$$;

create or replace function public.cast_note_vote(
  p_post_id uuid,
  p_direction text,
  p_strength integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_post record;
  v_access text;
  v_value integer;
  v_cost integer;
  v_stake integer;
  v_line integer;
  v_health integer;
  v_status text := 'live';
  v_outcome text := 'live';
  v_note text;
  v_hp integer;
begin
  if v_user is null then
    raise exception 'Sign in to vote.';
  end if;

  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'Choose up or down.';
  end if;

  if p_strength is null or p_strength < 1 or p_strength > 5 then
    raise exception 'Conviction is 1–5.';
  end if;

  select id, current_health, original_stake, status, sub_topic
  into v_post
  from public.research_posts
  where id = p_post_id
  for update;

  if not found then
    raise exception 'Post was not found.';
  end if;

  if exists (
    select 1
    from public.votes
    where user_id = v_user
      and post_id = p_post_id
  ) then
    raise exception 'You have already voted on this post.';
  end if;

  if v_post.status = 'ascended' then
    raise exception 'This post has ascended and is closed to votes.';
  end if;

  if v_post.status is distinct from 'live' then
    raise exception 'This post is no longer live.';
  end if;

  v_access := public.laniakea_note_access(v_user, p_post_id);

  if v_access = 'hidden' then
    raise exception 'This user is locked. Unlock it with UTL to read and engage.';
  end if;

  if v_access <> 'full' then
    raise exception 'Higher-tier users are view-only until you unlock them.';
  end if;

  v_value := case when p_direction = 'up' then p_strength else -p_strength end;
  v_cost := greatest(1, p_strength);
  perform public.laniakea_spend_hp(v_user, v_cost);

  insert into public.votes (user_id, post_id, value, health_at_vote)
  values (v_user, p_post_id, v_value, v_post.current_health);

  v_stake := coalesce(v_post.original_stake, v_post.current_health);
  v_line := 5 * greatest(v_stake, 1);
  v_health := v_post.current_health + v_value;

  if v_health <= 0 then
    v_health := 0;
    v_status := 'archived';
    v_outcome := 'hunt';
  elsif v_health >= v_line then
    v_health := v_line;
    v_status := 'ascended';
    v_outcome := 'ascent';
  end if;

  update public.research_posts
  set
    current_health = v_health,
    status = v_status,
    updated_at = now()
  where id = p_post_id;

  insert into public.hp_transactions (user_id, amount, type, post_id, description)
  values (
    v_user,
    v_cost,
    'vote',
    p_post_id,
    case when p_direction = 'up' then 'Upvote ' else 'Downvote ' end
      || p_strength || ' on research post ' || p_post_id
  );

  perform public.laniakea_track_topic(v_user, v_post.sub_topic, v_cost);

  if v_outcome = 'hunt' then
    begin
      perform public.settle_hunted_post(p_post_id);
    exception
      when others then
        v_note := 'Note hunted, but bounty failed: ' || sqlerrm;
    end;

    if v_note is null then
      begin
        perform public.settle_comments_on_hunted_post(p_post_id);
      exception
        when others then
          v_note := 'Note hunted, but comment cascade failed: ' || sqlerrm;
      end;
    end if;
  elsif v_outcome = 'ascent' then
    begin
      perform public.settle_ascended_post(p_post_id);
    exception
      when others then
        v_note := 'Note ascended, but harvest failed: ' || sqlerrm;
    end;
  end if;

  select current_hp into v_hp from public.profiles where id = v_user;

  return jsonb_build_object(
    'outcome', v_outcome,
    'health', v_health,
    'status', v_status,
    'hp', v_hp,
    'error', v_note,
    'message', case v_outcome
      when 'hunt' then 'Note hunted. Losing comments settled; winning comments refunded vote HP.'
      when 'ascent' then 'Note ascended. Downvote HP harvested for early ups and the author.'
      else 'Vote recorded.'
    end
  );
end;
$$;

create or replace function public.cast_comment_vote(
  p_comment_id uuid,
  p_direction text,
  p_strength integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_comment record;
  v_post record;
  v_access text;
  v_value integer;
  v_cost integer;
  v_stake integer;
  v_line integer;
  v_health integer;
  v_status text := 'live';
  v_outcome text := 'live';
  v_note text;
  v_hp integer;
begin
  if v_user is null then
    raise exception 'Sign in to vote.';
  end if;

  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'Choose up or down.';
  end if;

  if p_strength is null or p_strength < 1 or p_strength > 5 then
    raise exception 'Conviction is 1–5.';
  end if;

  select id, post_id, current_health, original_stake, status
  into v_comment
  from public.research_comments
  where id = p_comment_id
  for update;

  if not found then
    raise exception 'Comment was not found.';
  end if;

  select id, status, sub_topic
  into v_post
  from public.research_posts
  where id = v_comment.post_id;

  if not found then
    raise exception 'Post was not found.';
  end if;

  v_access := public.laniakea_note_access(v_user, v_post.id);

  if v_access = 'hidden' then
    raise exception 'This user is locked. Unlock it with UTL to read and engage.';
  end if;

  if v_access <> 'full' then
    raise exception 'Higher-tier users are view-only until you unlock them.';
  end if;

  if v_post.status = 'archived' then
    raise exception 'This post has been hunted. Comment votes are closed.';
  end if;

  if exists (
    select 1
    from public.comment_votes
    where user_id = v_user
      and comment_id = p_comment_id
  ) then
    raise exception 'You have already voted on this comment.';
  end if;

  if v_comment.status = 'ascended' then
    raise exception 'This comment has ascended and is closed to votes.';
  end if;

  if v_comment.status is distinct from 'live' then
    raise exception 'This comment is no longer live.';
  end if;

  v_value := case when p_direction = 'up' then p_strength else -p_strength end;
  v_cost := greatest(1, p_strength);
  perform public.laniakea_spend_hp(v_user, v_cost);

  insert into public.comment_votes (user_id, comment_id, value, health_at_vote)
  values (v_user, p_comment_id, v_value, v_comment.current_health);

  v_stake := coalesce(v_comment.original_stake, v_comment.current_health);
  v_line := 5 * greatest(v_stake, 1);
  v_health := v_comment.current_health + v_value;

  if v_health <= 0 then
    v_health := 0;
    v_status := 'archived';
    v_outcome := 'hunt';
  elsif v_health >= v_line then
    v_health := v_line;
    v_status := 'ascended';
    v_outcome := 'ascent';
  end if;

  update public.research_comments
  set
    current_health = v_health,
    status = v_status,
    updated_at = now()
  where id = p_comment_id;

  insert into public.hp_transactions (user_id, amount, type, post_id, comment_id, description)
  values (
    v_user,
    v_cost,
    'vote',
    v_post.id,
    p_comment_id,
    case when p_direction = 'up' then 'Upvote ' else 'Downvote ' end
      || p_strength || ' on comment ' || p_comment_id
  );

  perform public.laniakea_track_topic(v_user, v_post.sub_topic, v_cost);

  if v_outcome = 'hunt' then
    begin
      perform public.settle_hunted_comment(p_comment_id, v_post.id);
    exception
      when others then
        v_note := 'Comment hunted, but bounty failed: ' || sqlerrm;
    end;
  elsif v_outcome = 'ascent' then
    begin
      perform public.settle_ascended_comment(p_comment_id, v_post.id);
    exception
      when others then
        v_note := 'Comment ascended, but harvest failed: ' || sqlerrm;
    end;
  end if;

  select current_hp into v_hp from public.profiles where id = v_user;

  return jsonb_build_object(
    'outcome', v_outcome,
    'health', v_health,
    'status', v_status,
    'postId', v_post.id,
    'hp', v_hp,
    'error', v_note,
    'message', case v_outcome
      when 'hunt' then 'Comment hunted. Stake and ups paid to downvoters by timing.'
      when 'ascent' then 'Comment ascended. Downvote HP harvested for early ups and the author.'
      else 'Vote recorded.'
    end
  );
end;
$$;

create or replace function public.stake_comment(
  p_post_id uuid,
  p_body text,
  p_stake integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_post record;
  v_access text;
  v_id uuid;
  v_hp integer;
begin
  if v_user is null then
    raise exception 'Sign in to comment.';
  end if;

  if v_body = '' or char_length(v_body) > 8000 then
    raise exception 'Comment is required.';
  end if;

  if p_stake is null or p_stake < 1 then
    raise exception 'Stake at least 1 HP.';
  end if;

  if p_stake > 100 then
    raise exception 'Stake at most 100 HP.';
  end if;

  select id, author_id, status, sub_topic
  into v_post
  from public.research_posts
  where id = p_post_id;

  if not found then
    raise exception 'Post was not found.';
  end if;

  v_access := public.laniakea_note_access(v_user, p_post_id);

  if v_access = 'hidden' then
    raise exception 'This user is locked. Unlock it with UTL to read and engage.';
  end if;

  if v_access <> 'full' then
    raise exception 'Higher-tier users are view-only until you unlock them.';
  end if;

  if v_post.status = 'archived' then
    raise exception 'This post has been hunted. Comments are closed.';
  end if;

  v_hp := public.laniakea_spend_hp(v_user, p_stake);

  insert into public.research_comments (post_id, author_id, body, status, current_health, original_stake)
  values (p_post_id, v_user, v_body, 'live', p_stake, p_stake)
  returning id into v_id;

  insert into public.hp_transactions (user_id, amount, type, post_id, comment_id, description)
  values (v_user, p_stake, 'stake', p_post_id, v_id, 'Stake on comment ' || v_id);

  perform public.laniakea_track_topic(v_user, v_post.sub_topic, p_stake);

  return jsonb_build_object(
    'id', v_id,
    'postAuthorId', v_post.author_id,
    'hp', v_hp,
    'message', 'Comment posted.'
  );
end;
$$;

create or replace function public.stake_note(
  p_title text,
  p_body text,
  p_sub_topic text,
  p_stake integer,
  p_unlock_rate_multiple integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_topic text := btrim(coalesce(p_sub_topic, ''));
  v_id uuid;
  v_hp integer;
begin
  if v_user is null then
    raise exception 'Sign in to publish.';
  end if;

  if v_title = '' or char_length(v_title) > 200 then
    raise exception 'Title is required.';
  end if;

  if v_body = '' or char_length(v_body) > 20000 then
    raise exception 'Body is required.';
  end if;

  if v_topic = '' then
    raise exception 'Select a sector.';
  end if;

  if p_stake is null or p_stake < 1 then
    raise exception 'Stake at least 1 HP.';
  end if;

  if p_stake > 100 then
    raise exception 'Stake at most 100 HP.';
  end if;

  if p_unlock_rate_multiple is null or p_unlock_rate_multiple < 1 or p_unlock_rate_multiple > 5 then
    raise exception 'Unlock rate is 1–5×.';
  end if;

  v_hp := public.laniakea_spend_hp(v_user, p_stake);

  insert into public.research_posts (
    author_id,
    title,
    body,
    sub_topic,
    status,
    current_health,
    original_stake,
    unlock_rate_multiple
  )
  values (v_user, v_title, v_body, v_topic, 'live', p_stake, p_stake, p_unlock_rate_multiple)
  returning id into v_id;

  insert into public.hp_transactions (user_id, amount, type, post_id, description)
  values (v_user, p_stake, 'stake', v_id, 'Stake on ' || v_topic || ' research post ' || v_id);

  perform public.laniakea_track_topic(v_user, v_topic, p_stake);

  return jsonb_build_object('id', v_id, 'hp', v_hp, 'message', 'Note published.');
end;
$$;

create or replace function public.cash_out_hp(p_hp integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile record;
  v_tokens integer;
begin
  if v_user is null then
    raise exception 'Sign in to cash out.';
  end if;

  select tier, current_hp, utility_tokens
  into v_profile
  from public.profiles
  where id = v_user
  for update;

  if not found then
    raise exception 'Profile was not found.';
  end if;

  if lower(btrim(coalesce(v_profile.tier, ''))) <> 'masters' then
    raise exception 'Cash out is available to Masters only.';
  end if;

  if p_hp is null or p_hp < 10 then
    raise exception 'Cash out at least 10 HP.';
  end if;

  if p_hp % 10 <> 0 then
    raise exception 'Cash out HP in multiples of 10.';
  end if;

  if v_profile.current_hp - p_hp < 50 then
    raise exception 'Keep at least 50 HP in reserve.';
  end if;

  v_tokens := p_hp / 10;

  update public.profiles
  set
    current_hp = current_hp - p_hp,
    utility_tokens = utility_tokens + v_tokens,
    updated_at = now()
  where id = v_user;

  insert into public.hp_transactions (user_id, amount, type, description)
  values (v_user, p_hp, 'cashout', 'Cashed out ' || p_hp || ' HP for ' || v_tokens || ' UTL');

  begin
    insert into public.token_ledger (user_id, amount, direction, reason, metadata)
    values (v_user, v_tokens, 'credit', 'cashout', jsonb_build_object('source', 'wallet'));
  exception
    when undefined_table or undefined_column or check_violation then
      null;
  end;

  return jsonb_build_object(
    'currentHp', v_profile.current_hp - p_hp,
    'utilityTokens', v_profile.utility_tokens + v_tokens,
    'message', 'Cashed out ' || p_hp || ' HP for ' || v_tokens || ' UTL. Balance '
      || (v_profile.current_hp - p_hp) || ' HP / ' || (v_profile.utility_tokens + v_tokens) || ' UTL.'
  );
end;
$$;

revoke all on function public.laniakea_note_access(uuid, uuid) from public, anon, authenticated;
revoke all on function public.laniakea_spend_hp(uuid, integer) from public, anon, authenticated;
revoke all on function public.laniakea_track_topic(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.laniakea_refund(uuid, integer, uuid, uuid, text) from public, anon, authenticated;

revoke all on function public.settle_comments_on_hunted_post(uuid) from public, anon;
revoke all on function public.cast_note_vote(uuid, text, integer) from public, anon;
revoke all on function public.cast_comment_vote(uuid, text, integer) from public, anon;
revoke all on function public.stake_comment(uuid, text, integer) from public, anon;
revoke all on function public.stake_note(text, text, text, integer, integer) from public, anon;
revoke all on function public.cash_out_hp(integer) from public, anon;

grant execute on function public.settle_comments_on_hunted_post(uuid) to authenticated;
grant execute on function public.cast_note_vote(uuid, text, integer) to authenticated;
grant execute on function public.cast_comment_vote(uuid, text, integer) to authenticated;
grant execute on function public.stake_comment(uuid, text, integer) to authenticated;
grant execute on function public.stake_note(text, text, text, integer, integer) to authenticated;
grant execute on function public.cash_out_hp(integer) to authenticated;

notify pgrst, 'reload schema';
