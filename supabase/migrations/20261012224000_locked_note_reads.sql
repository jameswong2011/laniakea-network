-- The apps read note text through research_posts_open. For a note the reader cannot open, the view
-- holds the first 1000 characters of the body and leaves out claims, risks and the comment summary.
-- Comment counts stay whole on locked notes. Additive: the table keeps its current reads until
-- 20261012225000_close_locked_text.sql runs. Safe to re-run.

do $$
begin
  if to_regprocedure('public.laniakea_note_access(uuid, uuid)') is null then
    raise exception 'Run 20261012221000_balance_functions.sql first.';
  end if;
end
$$;

create or replace function public.can_open_note(p_post uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.laniakea_note_access((select auth.uid()), p_post) <> 'hidden'
$$;

revoke all on function public.can_open_note(uuid) from public, anon;
grant execute on function public.can_open_note(uuid) to authenticated;

-- Two entries in FROM keep the view read-only, so it never writes past the table's own policies.
create or replace view public.research_posts_open as
select
  p.id,
  p.author_id,
  p.title,
  case when length(p.body) <= 1000 or o.open then p.body else left(p.body, 1000) end as body,
  left(case when length(p.body) <= 1000 or o.open then p.body else left(p.body, 1000) end, 3000) as body_preview,
  p.status,
  p.current_health,
  p.original_stake,
  p.sub_topic,
  p.unlock_rate_multiple,
  p.created_at,
  p.updated_at,
  p.edited_at,
  p.ai_summary,
  p.ai_ticker,
  p.ai_conviction,
  case when o.open then p.ai_claims else '[]'::jsonb end as ai_claims,
  case when o.open then p.ai_risks else '[]'::jsonb end as ai_risks,
  case when o.open then p.ai_comment_agreement end as ai_comment_agreement,
  case when o.open then p.ai_comment_objection end as ai_comment_objection,
  p.ai_generated_at
from public.research_posts p
cross join lateral (select public.can_open_note(p.id) as open) o;

revoke all on public.research_posts_open from public, anon, authenticated;
grant select on public.research_posts_open to authenticated;

create or replace function public.note_comment_counts(p_post_ids uuid[])
returns table (post_id uuid, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.post_id, count(*)
  from public.research_comments c
  where c.post_id = any (p_post_ids)
  group by c.post_id
$$;

revoke all on function public.note_comment_counts(uuid[]) from public, anon;
grant execute on function public.note_comment_counts(uuid[]) to authenticated;

-- Search matches on the raw text first, so the trigram indexes stay in use, then applies the same
-- access rule as the view and the comment policy.
create or replace function public.search_note_bodies(p_patterns text[], p_limit integer default 20)
returns setof public.research_posts_open
language sql
stable
security definer
set search_path = public
as $$
  select v.*
  from public.research_posts_open v
  where v.id in (
      select p.id
      from public.research_posts p
      where p.body ilike p_patterns[1]
        and p.body ilike all (p_patterns)
    )
    and v.body ilike all (p_patterns)
  order by v.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

create or replace function public.search_comments(p_patterns text[], p_limit integer default 12)
returns table (id uuid, post_id uuid, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.post_id, c.body, c.created_at
  from public.research_comments c
  where c.body ilike p_patterns[1]
    and c.body ilike all (p_patterns)
    and (c.author_id = (select auth.uid()) or public.can_open_note(c.post_id))
  order by c.created_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50)
$$;

revoke all on function public.search_note_bodies(text[], integer) from public, anon;
revoke all on function public.search_comments(text[], integer) from public, anon;
grant execute on function public.search_note_bodies(text[], integer) to authenticated;
grant execute on function public.search_comments(text[], integer) to authenticated;

notify pgrst, 'reload schema';
