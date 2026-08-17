-- Parent-hunt cascade: refunded comment status + refund ledger type.
-- Mirrors COMMENT_CASCADE_SQL in src/lib/research/comments-sql.ts

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.research_comments'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format(
      'alter table public.research_comments drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

do $$
begin
  alter table public.research_comments
    add constraint research_comments_status_check
    check (status in ('live', 'archived', 'ascended', 'refunded'));
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
      type in (
        'stake',
        'vote',
        'drain',
        'buy',
        'cashout',
        'calibration',
        'hunt',
        'ascent',
        'refund'
      )
    );
exception
  when duplicate_object then null;
end
$$;
