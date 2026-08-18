-- HP does not travel between desks. A promote or demote resets to 1000 HP.
-- Safe to re-run. Replaces public.apply_book_calibration.

create or replace function public.apply_book_calibration(p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  promo integer := 0;
  demo integer := 0;
begin
  create temporary table if not exists weekly_cal_moves (
    id uuid,
    from_tier text,
    to_tier text,
    direction text,
    current_hp integer
  ) on commit drop;

  delete from weekly_cal_moves;

  if p_scope = 'overall' then
    insert into weekly_cal_moves (id, from_tier, to_tier, direction, current_hp)
    with ranked as (
      select
        id,
        username,
        tier,
        current_hp,
        count(*) over () as n
      from public.profiles
    ),
    prepared as (
      select
        *,
        case
          when n < 2 then 0
          else greatest(1, floor(n * 0.25)::integer)
        end as band
      from ranked
    ),
    cut as (
      select
        n,
        band,
        (array_agg(current_hp order by current_hp desc, username asc))[band] as top_edge,
        (array_agg(current_hp order by current_hp asc, username desc))[band] as bot_edge
      from prepared
      group by n, band
    ),
    flagged as (
      select
        p.*,
        (c.band > 0 and p.current_hp >= c.top_edge) as in_top,
        (c.band > 0 and p.current_hp <= c.bot_edge) as in_bot
      from prepared p
      cross join cut c
    )
    select
      id,
      tier,
      public.adjacent_tier(tier, 1),
      'up',
      current_hp
    from flagged
    where in_top
      and not in_bot
      and public.adjacent_tier(tier, 1) is not null
    union all
    select
      id,
      tier,
      public.adjacent_tier(tier, -1),
      'down',
      current_hp
    from flagged
    where in_bot
      and not in_top
      and public.adjacent_tier(tier, -1) is not null;

    update public.profiles p
    set
      tier = m.to_tier,
      current_hp = 1000,
      updated_at = now()
    from weekly_cal_moves m
    where p.id = m.id;
  else
    insert into weekly_cal_moves (id, from_tier, to_tier, direction, current_hp)
    with ranked as (
      select
        r.user_id as id,
        coalesce(p.username, r.user_id::text) as username,
        r.tier,
        r.current_hp,
        count(*) over () as n
      from public.subtopic_ranks r
      left join public.profiles p on p.id = r.user_id
      where r.sub_topic = p_scope
    ),
    prepared as (
      select
        *,
        case
          when n < 2 then 0
          else greatest(1, floor(n * 0.25)::integer)
        end as band
      from ranked
    ),
    cut as (
      select
        n,
        band,
        (array_agg(current_hp order by current_hp desc, username asc))[band] as top_edge,
        (array_agg(current_hp order by current_hp asc, username desc))[band] as bot_edge
      from prepared
      group by n, band
    ),
    flagged as (
      select
        p.*,
        (c.band > 0 and p.current_hp >= c.top_edge) as in_top,
        (c.band > 0 and p.current_hp <= c.bot_edge) as in_bot
      from prepared p
      cross join cut c
    )
    select
      id,
      tier,
      public.adjacent_tier(tier, 1),
      'up',
      current_hp
    from flagged
    where in_top
      and not in_bot
      and public.adjacent_tier(tier, 1) is not null
    union all
    select
      id,
      tier,
      public.adjacent_tier(tier, -1),
      'down',
      current_hp
    from flagged
    where in_bot
      and not in_top
      and public.adjacent_tier(tier, -1) is not null;

    update public.subtopic_ranks r
    set
      tier = m.to_tier,
      current_hp = 1000,
      updated_at = now()
    from weekly_cal_moves m
    where r.user_id = m.id
      and r.sub_topic = p_scope;
  end if;

  select
    count(*) filter (where direction = 'up'),
    count(*) filter (where direction = 'down')
  into promo, demo
  from weekly_cal_moves;

  begin
    insert into public.hp_transactions (user_id, amount, type, description)
    select
      id,
      1000 - current_hp,
      'calibration',
      format(
        'Calibration %s: %s %s → %s (reset %s → 1000 HP)',
        p_scope,
        case when direction = 'up' then 'promoted' else 'demoted' end,
        from_tier,
        to_tier,
        current_hp
      )
    from weekly_cal_moves;
  exception
    when others then null;
  end;

  return jsonb_build_object('promoted', promo, 'demoted', demo);
end;
$$;
