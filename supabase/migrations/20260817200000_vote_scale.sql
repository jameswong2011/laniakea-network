-- Allow up/down votes at conviction 1–5 (stored as ±1…±5).

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.votes'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%value%'
  loop
    execute format('alter table public.votes drop constraint %I', constraint_name);
  end loop;
end
$$;

do $$
begin
  alter table public.votes
    add constraint votes_value_check
    check (value <> 0 and abs(value) between 1 and 5);
exception
  when duplicate_object then null;
end
$$;
