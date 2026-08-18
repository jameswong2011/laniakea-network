export const VOTE_SCALE_BLOCKED_MESSAGE =
  "Vote scale 1–5 is blocked by the database check. Copy the vote-scale SQL, run it in the Supabase SQL editor, then try again.";

export const VOTE_SCALE_SQL = `-- Force vote scale 1–5 on posts and comments (stored as ±1…±5).
-- One script. Safe to re-run. Does not change Hunt / Ascent HP math.
-- The last SELECT must show abs(value) between 1 and 5. If it still
-- shows ARRAY[-1, 1] or value = ±1, the check did not update.

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

notify pgrst, 'reload schema';

select
  n.nspname as schema,
  c.relname as table_name,
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('votes', 'comment_votes')
  and con.contype = 'c'
order by c.relname, con.conname;
`;

export function isVoteScaleBlocked(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("votes_value_check") ||
    message.includes("comment_votes_value_check") ||
    (error.code === "23514" && message.includes("value"))
  );
}

export function formatVoteInsertError(error: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}) {
  return [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(" ");
}
