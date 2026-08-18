-- Force vote scale 1–5 on posts and comments (stored as ±1…±5).

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.votes'::regclass
      and c.contype = 'c'
  loop
    execute format('alter table public.votes drop constraint %I', constraint_name);
  end loop;
end
$$;

alter table public.votes
  drop constraint if exists votes_value_check;

alter table public.votes
  drop constraint if exists votes_claim_tier_check;

alter table public.votes
  drop column if exists claim_tier;

alter table public.votes
  alter column value type integer using value::integer;

alter table public.votes
  add constraint votes_value_check
  check (value <> 0 and abs(value) between 1 and 5);

do $$
declare
  constraint_name text;
begin
  if to_regclass('public.comment_votes') is null then
    return;
  end if;

  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.comment_votes'::regclass
      and c.contype = 'c'
  loop
    execute format(
      'alter table public.comment_votes drop constraint %I',
      constraint_name
    );
  end loop;

  execute $sql$
    alter table public.comment_votes
      alter column value type integer using value::integer
  $sql$;

  execute $sql$
    alter table public.comment_votes
      add constraint comment_votes_value_check
      check (value <> 0 and abs(value) between 1 and 5)
  $sql$;
end
$$;
