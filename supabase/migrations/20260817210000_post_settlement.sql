-- Post hunt/ascent settlement columns and ledger types.
-- Mirrors src/lib/research/settlement-sql.ts

alter table public.research_posts
  add column if not exists original_stake integer;

update public.research_posts
set original_stake = current_health
where original_stake is null;

alter table public.research_posts
  alter column original_stake set default 0;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.research_posts'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format(
      'alter table public.research_posts drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

do $$
begin
  alter table public.research_posts
    add constraint research_posts_status_check
    check (status in ('live', 'archived', 'ascended'));
exception
  when duplicate_object then null;
end
$$;

alter table public.votes
  add column if not exists health_at_vote integer;

alter table public.votes
  add column if not exists claim_tier integer;

do $$
begin
  alter table public.votes
    add constraint votes_claim_tier_check
    check (claim_tier in (1, 2, 3));
exception
  when duplicate_object then null;
end
$$;

alter table public.profiles
  alter column current_hp set default 1000;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.hp_transactions'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%type%'
  loop
    execute format(
      'alter table public.hp_transactions drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

do $$
begin
  alter table public.hp_transactions
    add constraint hp_transactions_type_check
    check (
      type in (
        'stake',
        'vote',
        'drain',
        'buy',
        'cashout',
        'calibration',
        'hunt',
        'ascent'
      )
    );
exception
  when duplicate_object then null;
end
$$;
