-- Apply hunt / ascent bounties inside Postgres so RLS cannot block credits.
-- Same math as the app. Safe to re-run. Idempotent per desk + subject.

create or replace function public.laniakea_allocate_integers(
  p_weights numeric[],
  p_pot integer
)
returns integer[]
language plpgsql
immutable
as $$
declare
  n integer;
  total numeric := 0;
  raw numeric[];
  floors integer[];
  leftover integer;
  i integer;
  order_idx integer[];
begin
  n := coalesce(array_length(p_weights, 1), 0);

  if p_pot <= 0 or n = 0 then
    return coalesce(
      (select array_agg(0) from generate_series(1, n)),
      '{}'::integer[]
    );
  end if;

  for i in 1..n loop
    total := total + coalesce(p_weights[i], 0);
  end loop;

  if total <= 0 then
    floors := '{}';
    for i in 1..n loop
      floors := floors || 0;
    end loop;
    return floors;
  end if;

  raw := '{}';
  floors := '{}';
  leftover := p_pot;

  for i in 1..n loop
    raw := raw || ((coalesce(p_weights[i], 0) / total) * p_pot);
    floors := floors || floor(raw[i])::integer;
    leftover := leftover - floor(raw[i])::integer;
  end loop;

  order_idx := (
    select coalesce(array_agg(idx order by frac desc, idx asc), '{}')
    from (
      select gs as idx, raw[gs] - floor(raw[gs]) as frac
      from generate_series(1, n) as gs
    ) ranked
  );

  foreach i in array order_idx loop
    exit when leftover <= 0;
    floors[i] := floors[i] + 1;
    leftover := leftover - 1;
  end loop;

  return floors;
end;
$$;

create or replace function public.laniakea_increment_hp(
  p_id uuid,
  p_amount integer
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

  update public.profiles
  set
    current_hp = current_hp + p_amount,
    updated_at = now()
  where id = p_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.laniakea_increment_hp(uuid, integer) from public;

create or replace function public.laniakea_pay(
  p_user uuid,
  p_amount integer,
  p_type text,
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
      and type = p_type
      and comment_id is not distinct from p_comment
  ) then
    return;
  end if;

  perform public.laniakea_increment_hp(p_user, p_amount);

  begin
    insert into public.hp_transactions (
      user_id,
      amount,
      type,
      post_id,
      comment_id,
      description
    )
    values (
      p_user,
      p_amount,
      p_type,
      p_post,
      p_comment,
      p_description
    );
  exception
    when undefined_column then
      insert into public.hp_transactions (
        user_id,
        amount,
        type,
        post_id,
        description
      )
      values (
        p_user,
        p_amount,
        p_type,
        p_post,
        p_description
      );
  end;
end;
$$;

revoke all on function public.laniakea_pay(uuid, integer, text, uuid, uuid, text) from public;

create or replace function public.settle_hunted_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stake integer;
  v_status text;
  v_pot integer;
  v_raw numeric := 0;
  v_payable integer;
  v_users uuid[] := '{}';
  v_weights numeric[] := '{}';
  v_mults numeric[] := '{}';
  v_shares integer[];
  r record;
  i integer;
  v_mult numeric;
  v_weight numeric;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select coalesce(original_stake, 0), status
  into v_stake, v_status
  from public.research_posts
  where id = p_post_id;

  if not found then
    raise exception 'Post not found';
  end if;

  if v_status is distinct from 'archived' then
    raise exception 'Post is not hunted';
  end if;

  v_pot := greatest(v_stake, 0) + coalesce((
    select sum(abs(value))
    from public.votes
    where post_id = p_post_id
      and value > 0
  ), 0);

  for r in
    select user_id, abs(value) as amt, coalesce(health_at_vote, 0) as health
    from public.votes
    where post_id = p_post_id
      and value < 0
  loop
    v_mult := greatest(
      0.4,
      2.1 * power(
        (greatest(r.health, 0)::numeric / greatest(v_stake, 1)::numeric),
        1.35
      )
    );
    v_weight := r.amt * v_mult;

    if v_weight > 0 then
      v_users := array_append(v_users, r.user_id);
      v_weights := array_append(v_weights, v_weight);
      v_mults := array_append(v_mults, v_mult);
      v_raw := v_raw + v_weight;
    end if;
  end loop;

  if coalesce(array_length(v_users, 1), 0) = 0 or v_pot <= 0 then
    return jsonb_build_object('ok', true, 'paid', 0);
  end if;

  v_payable := case when v_raw > v_pot then v_pot else floor(v_raw)::integer end;
  v_shares := public.laniakea_allocate_integers(v_weights, v_payable);

  for i in 1..array_length(v_users, 1) loop
    if v_shares[i] > 0 then
      perform public.laniakea_pay(
        v_users[i],
        v_shares[i],
        'hunt',
        p_post_id,
        null,
        'Hunt bounty (' || to_char(v_mults[i], 'FM0.00') || 'x) on research post ' || p_post_id
      );
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'paid', v_payable);
end;
$$;

create or replace function public.settle_ascended_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stake integer;
  v_status text;
  v_author uuid;
  v_down integer;
  v_raw numeric := 0;
  v_long_pool integer;
  v_author_amt integer;
  v_users uuid[] := '{}';
  v_weights numeric[] := '{}';
  v_mults numeric[] := '{}';
  v_shares integer[];
  r record;
  i integer;
  v_mult numeric;
  v_weight numeric;
  v_line numeric;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select coalesce(original_stake, 0), status, author_id
  into v_stake, v_status, v_author
  from public.research_posts
  where id = p_post_id;

  if not found then
    raise exception 'Post not found';
  end if;

  if v_status is distinct from 'ascended' then
    raise exception 'Post is not ascended';
  end if;

  v_down := coalesce((
    select sum(abs(value))
    from public.votes
    where post_id = p_post_id
      and value < 0
  ), 0);

  if v_down <= 0 then
    return jsonb_build_object('ok', true, 'paid', 0);
  end if;

  v_line := 5 * greatest(v_stake, 1);

  for r in
    select user_id, abs(value) as amt, coalesce(health_at_vote, 0) as health
    from public.votes
    where post_id = p_post_id
      and value > 0
  loop
    v_mult := greatest(
      0.18,
      3.15 * power(
        1 - least(1, greatest(r.health, 0)::numeric / v_line),
        1.55
      )
    );
    v_weight := r.amt * v_mult;

    if v_weight > 0 then
      v_users := array_append(v_users, r.user_id);
      v_weights := array_append(v_weights, v_weight);
      v_mults := array_append(v_mults, v_mult);
      v_raw := v_raw + v_weight;
    end if;
  end loop;

  if coalesce(array_length(v_users, 1), 0) = 0 then
    perform public.laniakea_pay(
      v_author,
      v_down,
      'ascent',
      p_post_id,
      null,
      'Ascent harvest (author) on research post ' || p_post_id
    );
    return jsonb_build_object('ok', true, 'paid', v_down);
  end if;

  if v_raw > v_down then
    v_long_pool := v_down;
  else
    v_long_pool := least(v_down, round(v_down * 0.75)::integer);
  end if;

  v_author_amt := v_down - v_long_pool;
  v_shares := public.laniakea_allocate_integers(v_weights, v_long_pool);

  for i in 1..array_length(v_users, 1) loop
    if v_shares[i] > 0 then
      perform public.laniakea_pay(
        v_users[i],
        v_shares[i],
        'ascent',
        p_post_id,
        null,
        'Ascent harvest (' || to_char(v_mults[i], 'FM0.00') || 'x) on research post ' || p_post_id
      );
    end if;
  end loop;

  if v_author_amt > 0 then
    perform public.laniakea_pay(
      v_author,
      v_author_amt,
      'ascent',
      p_post_id,
      null,
      'Ascent harvest (author) on research post ' || p_post_id
    );
  end if;

  return jsonb_build_object('ok', true, 'paid', v_down);
end;
$$;

create or replace function public.settle_hunted_comment(
  p_comment_id uuid,
  p_post_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stake integer;
  v_pot integer;
  v_raw numeric := 0;
  v_payable integer;
  v_users uuid[] := '{}';
  v_weights numeric[] := '{}';
  v_mults numeric[] := '{}';
  v_shares integer[];
  r record;
  i integer;
  v_mult numeric;
  v_weight numeric;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select coalesce(original_stake, 0)
  into v_stake
  from public.research_comments
  where id = p_comment_id;

  if not found then
    raise exception 'Comment not found';
  end if;

  v_pot := greatest(v_stake, 0) + coalesce((
    select sum(abs(value))
    from public.comment_votes
    where comment_id = p_comment_id
      and value > 0
  ), 0);

  for r in
    select user_id, abs(value) as amt, coalesce(health_at_vote, 0) as health
    from public.comment_votes
    where comment_id = p_comment_id
      and value < 0
  loop
    v_mult := greatest(
      0.4,
      2.1 * power(
        (greatest(r.health, 0)::numeric / greatest(v_stake, 1)::numeric),
        1.35
      )
    );
    v_weight := r.amt * v_mult;

    if v_weight > 0 then
      v_users := array_append(v_users, r.user_id);
      v_weights := array_append(v_weights, v_weight);
      v_mults := array_append(v_mults, v_mult);
      v_raw := v_raw + v_weight;
    end if;
  end loop;

  if coalesce(array_length(v_users, 1), 0) = 0 or v_pot <= 0 then
    return jsonb_build_object('ok', true, 'paid', 0);
  end if;

  v_payable := case when v_raw > v_pot then v_pot else floor(v_raw)::integer end;
  v_shares := public.laniakea_allocate_integers(v_weights, v_payable);

  for i in 1..array_length(v_users, 1) loop
    if v_shares[i] > 0 then
      perform public.laniakea_pay(
        v_users[i],
        v_shares[i],
        'hunt',
        p_post_id,
        p_comment_id,
        'Hunt bounty (' || to_char(v_mults[i], 'FM0.00') || 'x) on comment ' || p_comment_id
      );
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'paid', v_payable);
end;
$$;

create or replace function public.settle_ascended_comment(
  p_comment_id uuid,
  p_post_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stake integer;
  v_author uuid;
  v_down integer;
  v_raw numeric := 0;
  v_long_pool integer;
  v_author_amt integer;
  v_users uuid[] := '{}';
  v_weights numeric[] := '{}';
  v_mults numeric[] := '{}';
  v_shares integer[];
  r record;
  i integer;
  v_mult numeric;
  v_weight numeric;
  v_line numeric;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select coalesce(original_stake, 0), author_id
  into v_stake, v_author
  from public.research_comments
  where id = p_comment_id;

  if not found then
    raise exception 'Comment not found';
  end if;

  v_down := coalesce((
    select sum(abs(value))
    from public.comment_votes
    where comment_id = p_comment_id
      and value < 0
  ), 0);

  if v_down <= 0 then
    return jsonb_build_object('ok', true, 'paid', 0);
  end if;

  v_line := 5 * greatest(v_stake, 1);

  for r in
    select user_id, abs(value) as amt, coalesce(health_at_vote, 0) as health
    from public.comment_votes
    where comment_id = p_comment_id
      and value > 0
  loop
    v_mult := greatest(
      0.18,
      3.15 * power(
        1 - least(1, greatest(r.health, 0)::numeric / v_line),
        1.55
      )
    );
    v_weight := r.amt * v_mult;

    if v_weight > 0 then
      v_users := array_append(v_users, r.user_id);
      v_weights := array_append(v_weights, v_weight);
      v_mults := array_append(v_mults, v_mult);
      v_raw := v_raw + v_weight;
    end if;
  end loop;

  if coalesce(array_length(v_users, 1), 0) = 0 then
    perform public.laniakea_pay(
      v_author,
      v_down,
      'ascent',
      p_post_id,
      p_comment_id,
      'Ascent harvest (author) on comment ' || p_comment_id
    );
    return jsonb_build_object('ok', true, 'paid', v_down);
  end if;

  if v_raw > v_down then
    v_long_pool := v_down;
  else
    v_long_pool := least(v_down, round(v_down * 0.75)::integer);
  end if;

  v_author_amt := v_down - v_long_pool;
  v_shares := public.laniakea_allocate_integers(v_weights, v_long_pool);

  for i in 1..array_length(v_users, 1) loop
    if v_shares[i] > 0 then
      perform public.laniakea_pay(
        v_users[i],
        v_shares[i],
        'ascent',
        p_post_id,
        p_comment_id,
        'Ascent harvest (' || to_char(v_mults[i], 'FM0.00') || 'x) on comment ' || p_comment_id
      );
    end if;
  end loop;

  if v_author_amt > 0 then
    perform public.laniakea_pay(
      v_author,
      v_author_amt,
      'ascent',
      p_post_id,
      p_comment_id,
      'Ascent harvest (author) on comment ' || p_comment_id
    );
  end if;

  return jsonb_build_object('ok', true, 'paid', v_down);
end;
$$;

grant execute on function public.settle_hunted_post(uuid) to authenticated;
grant execute on function public.settle_ascended_post(uuid) to authenticated;
grant execute on function public.settle_hunted_comment(uuid, uuid) to authenticated;
grant execute on function public.settle_ascended_comment(uuid, uuid) to authenticated;
