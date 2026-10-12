-- Note text, claims, risks and the comment summary leave direct reads, so a note the reader cannot
-- open shows only what research_posts_open holds. Comments and replies on those notes stay visible
-- to their own authors and to readers who can open the note.
-- Run after 20261012224000_locked_note_reads.sql, once the apps that read through the view are live.
-- Safe to re-run.

do $$
begin
  if to_regclass('public.research_posts_open') is null
    or to_regprocedure('public.can_open_note(uuid)') is null then
    raise exception 'Run 20261012224000_locked_note_reads.sql first.';
  end if;
end
$$;

do $$
declare
  v_columns text;
begin
  select string_agg(format('%I', column_name), ', ' order by ordinal_position)
  into v_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'research_posts'
    and column_name not in ('body', 'ai_claims', 'ai_risks', 'ai_comment_agreement', 'ai_comment_objection');

  revoke select on public.research_posts from anon, authenticated;
  execute format('grant select (%s) on public.research_posts to authenticated', v_columns);
end
$$;

drop policy if exists research_comments_read on public.research_comments;
create policy research_comments_read on public.research_comments
  for select to authenticated
  using (author_id = (select auth.uid()) or public.can_open_note(post_id));

drop policy if exists comment_replies_read on public.comment_replies;
create policy comment_replies_read on public.comment_replies
  for select to authenticated
  using (
    author_id = (select auth.uid())
    or exists (select 1 from public.research_comments c where c.id = comment_replies.comment_id)
  );

notify pgrst, 'reload schema';
