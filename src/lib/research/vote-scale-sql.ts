export const VOTE_SCALE_BLOCKED_MESSAGE =
  "Vote scale 1–5 is blocked by the database check. Copy the vote-scale SQL, run it in the Supabase SQL editor, then try again.";

export const VOTE_SCALE_SQL = `-- Vote scale 1–5 on posts and comments (stored as ±1…±5).
-- Safe to re-run. Does not change Hunt / Ascent HP math.

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
      and pg_get_constraintdef(c.oid) ilike '%value%'
  loop
    execute format(
      'alter table public.comment_votes drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.comment_votes') is null then
    return;
  end if;

  alter table public.comment_votes
    add constraint comment_votes_value_check
    check (value <> 0 and abs(value) between 1 and 5);
exception
  when duplicate_object then null;
end
$$;
`;

export function isVoteScaleBlocked(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return (
    message.includes("votes_value_check") ||
    message.includes("comment_votes_value_check") ||
    error.code === "23514"
  );
}
