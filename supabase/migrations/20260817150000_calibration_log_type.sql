-- Optional: allow calibration rows in hp_transactions.
-- Safe to run if the type check already exists.

do $$
begin
  alter table public.hp_transactions
    drop constraint if exists hp_transactions_type_check;
exception
  when undefined_object then null;
end
$$;

do $$
begin
  alter table public.hp_transactions
    add constraint hp_transactions_type_check
    check (
      type in ('stake', 'vote', 'drain', 'buy', 'cashout', 'calibration')
    );
exception
  when duplicate_object then null;
end
$$;
