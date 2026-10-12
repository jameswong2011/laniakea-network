-- Reaction totals per target in one call, so screens fetch counts instead of every reaction row.
-- Runs with the caller's row security. Safe to re-run.

create or replace function public.reaction_counts(p_target_type text, p_target_ids uuid[])
returns table (target_id uuid, reaction text, total bigint, mine boolean)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.target_id,
    r.reaction,
    count(*) as total,
    coalesce(bool_or(r.user_id = (select auth.uid())), false) as mine
  from public.content_reactions r
  where r.target_type = p_target_type
    and r.target_id = any (p_target_ids)
  group by r.target_id, r.reaction;
$$;

grant execute on function public.reaction_counts(text, uuid[]) to authenticated;

notify pgrst, 'reload schema';
