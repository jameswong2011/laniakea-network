-- Money helpers and weekly maintenance stop answering direct calls from the app's keys.
-- The functions that call them keep working, since they run as their owner.
-- Comment settlement now needs a closed comment on the note it belongs to. Payout math is unchanged.
-- Safe to re-run.

do $$
declare
  target record;
begin
  for target in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'laniakea_increment_hp',
        'laniakea_pay',
        'spend_with_referral_internal',
        'apply_utl_move',
        'apply_book_calibration'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', target.signature);
  end loop;

  for target in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'run_weekly_maintenance'
  loop
    execute format('revoke execute on function %s from public, anon', target.signature);
  end loop;
end
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
  v_status text;
  v_post_status text;
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

  select coalesce(c.original_stake, 0), c.status, p.status
  into v_stake, v_status, v_post_status
  from public.research_comments c
  join public.research_posts p on p.id = c.post_id
  where c.id = p_comment_id
    and c.post_id = p_post_id;

  if not found then
    raise exception 'Comment not found';
  end if;

  if not (v_status = 'archived' or (v_status = 'live' and v_post_status = 'archived')) then
    raise exception 'Comment is not hunted';
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

  select coalesce(original_stake, 0), author_id, status
  into v_stake, v_author, v_status
  from public.research_comments
  where id = p_comment_id
    and post_id = p_post_id;

  if not found then
    raise exception 'Comment not found';
  end if;

  if v_status is distinct from 'ascended' then
    raise exception 'Comment is not ascended';
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

grant execute on function public.settle_hunted_comment(uuid, uuid) to authenticated;
grant execute on function public.settle_ascended_comment(uuid, uuid) to authenticated;
