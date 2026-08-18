-- Weekly 3 HP drain + quartile calibration.
-- Run once in the Supabase SQL editor. Schedules Monday 08:00 UTC via pg_cron
-- when the extension is available.

create table if not exists public.weekly_maintenance_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  source text not null default 'cron',
  drained integer not null default 0,
  promoted integer not null default 0,
  demoted integer not null default 0,
  skipped boolean not null default false,
  detail jsonb
);

create index if not exists weekly_maintenance_runs_ran_at_idx
  on public.weekly_maintenance_runs (ran_at desc);

alter table public.weekly_maintenance_runs enable row level security;

do $$
begin
  create policy weekly_maintenance_runs_read
    on public.weekly_maintenance_runs
    for select
    to authenticated
    using (true);
exception
  when duplicate_object then null;
end
$$;

grant select on table public.weekly_maintenance_runs to authenticated;

create or replace function public.adjacent_tier(current text, delta integer)
returns text
language sql
immutable
as $$
  select case
    when delta > 0 then
      case current
        when 'Bronze' then 'Silver'
        when 'Silver' then 'Gold'
        when 'Gold' then 'Platinum'
        when 'Platinum' then 'Masters'
        else null
      end
    else
      case current
        when 'Masters' then 'Platinum'
        when 'Platinum' then 'Gold'
        when 'Gold' then 'Silver'
        when 'Silver' then 'Bronze'
        else null
      end
  end;
$$;

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

create or replace function public.run_weekly_maintenance(p_source text default 'cron')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  week_start timestamptz;
  drain_count integer := 0;
  promo_count integer := 0;
  demo_count integer := 0;
  topic text;
  book jsonb;
  result jsonb;
begin
  if auth.uid() is not null and not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'admin only';
  end if;

  week_start := date_trunc('week', timezone('utc', now())) at time zone 'utc';

  if p_source = 'cron' and exists (
    select 1
    from public.weekly_maintenance_runs r
    where r.skipped = false
      and r.ran_at >= week_start
  ) then
    insert into public.weekly_maintenance_runs (
      source, drained, promoted, demoted, skipped, detail
    ) values (
      p_source, 0, 0, 0, true, jsonb_build_object('reason', 'already_ran')
    );

    return jsonb_build_object(
      'skipped', true,
      'drained', 0,
      'drain_skipped', 0,
      'promoted', 0,
      'demoted', 0
    );
  end if;

  create temporary table if not exists weekly_drain_targets (
    id uuid,
    amount integer
  ) on commit drop;

  delete from weekly_drain_targets;

  insert into weekly_drain_targets (id, amount)
  select
    id,
    least(3, current_hp)
  from public.profiles
  where role is distinct from 'admin'
    and current_hp > 0;

  update public.profiles p
  set
    current_hp = p.current_hp - t.amount,
    updated_at = now()
  from weekly_drain_targets t
  where p.id = t.id;

  select count(*) into drain_count
  from weekly_drain_targets;

  begin
    insert into public.hp_transactions (user_id, amount, type, description)
    select
      id,
      amount,
      'drain',
      'Passive drain ' || amount || ' HP'
    from weekly_drain_targets;
  exception
    when others then null;
  end;

  book := public.apply_book_calibration('overall');
  promo_count := coalesce((book->>'promoted')::integer, 0);
  demo_count := coalesce((book->>'demoted')::integer, 0);

  foreach topic in array array[
    'Healthcare',
    'Biotech',
    'Banks',
    'Insurance',
    'Payments',
    'Technology',
    'Software',
    'Semiconductors',
    'Cybersecurity',
    'Consumer',
    'Autos',
    'Industrials',
    'Defense',
    'Telecom',
    'Real Estate',
    'Utilities',
    'Energy',
    'Mining',
    'Macro',
    'FX',
    'Credit',
    'Emerging Markets',
    'China',
    'Commodities',
    'Crypto',
    'Quant',
    'Private Markets'
  ]
  loop
    begin
      book := public.apply_book_calibration(topic);
      promo_count := promo_count + coalesce((book->>'promoted')::integer, 0);
      demo_count := demo_count + coalesce((book->>'demoted')::integer, 0);
    exception
      when undefined_table then null;
      when others then null;
    end;
  end loop;

  result := jsonb_build_object(
    'skipped', false,
    'drained', drain_count,
    'drain_skipped', 0,
    'promoted', promo_count,
    'demoted', demo_count
  );

  insert into public.weekly_maintenance_runs (
    source, drained, promoted, demoted, skipped, detail
  ) values (
    p_source, drain_count, promo_count, demo_count, false, result
  );

  return result;
end;
$$;

revoke all on function public.adjacent_tier(text, integer) from public;
revoke all on function public.apply_book_calibration(text) from public;
revoke all on function public.run_weekly_maintenance(text) from public;
grant execute on function public.run_weekly_maintenance(text) to service_role;
grant execute on function public.run_weekly_maintenance(text) to authenticated;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'laniakea-weekly-maintenance';

  perform cron.schedule(
    'laniakea-weekly-maintenance',
    '0 8 * * 1',
    $cron$select public.run_weekly_maintenance('cron')$cron$
  );
exception
  when undefined_table then null;
  when undefined_function then null;
  when others then null;
end
$$;
