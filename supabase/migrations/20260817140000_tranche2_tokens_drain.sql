-- Tranche 2: mock utility tokens and broader HP ledger types.
-- Run this once in the Supabase SQL editor if the CLI is not linked.

alter table public.profiles
  add column if not exists utility_tokens integer;

update public.profiles
set utility_tokens = 100
where utility_tokens is null;

alter table public.profiles
  alter column utility_tokens set default 100;

alter table public.profiles
  alter column utility_tokens set not null;

do $$
begin
  alter table public.profiles
    add constraint profiles_utility_tokens_check
    check (utility_tokens >= 0);
exception
  when duplicate_object then null;
end
$$;

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
      type in ('stake', 'vote', 'drain', 'buy', 'cashout')
    );
exception
  when duplicate_object then null;
end
$$;
