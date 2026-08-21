/** One-shot tape wipe. Keeps profiles, HP, UTL, invites, and weekly history. */
export const FORUM_WIPE_SQL = `
create or replace function public.wipe_forum_content()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_posts integer := 0;
  v_comments integer := 0;
  v_drafts integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  delete from public.content_reactions where true;
  delete from public.content_drafts where true;
  get diagnostics v_drafts = row_count;
  delete from public.subtopic_ranks where true;

  begin
    delete from public.comment_reply_likes where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.comment_replies where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.comment_votes where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.research_comments where true;
    get diagnostics v_comments = row_count;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.votes where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.post_unlocks where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.saved_posts where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.post_subscriptions where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.notifications where true;
  exception
    when undefined_table then null;
  end;

  delete from public.research_posts where true;
  get diagnostics v_posts = row_count;

  update public.hp_transactions
  set comment_id = null
  where comment_id is not null;

  begin
    delete from storage.objects
    where bucket_id = 'research-media';
  exception
    when undefined_table then null;
    when insufficient_privilege then null;
  end;

  return jsonb_build_object(
    'posts', v_posts,
    'comments', v_comments,
    'drafts', v_drafts
  );
end;
$$;

grant execute on function public.wipe_forum_content() to authenticated;

-- Run the wipe now (SQL editor is already superuser).
do $$
declare
  v_posts integer := 0;
  v_comments integer := 0;
begin
  delete from public.content_reactions where true;
  delete from public.content_drafts where true;
  delete from public.subtopic_ranks where true;

  begin
    delete from public.comment_reply_likes where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.comment_replies where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.comment_votes where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.research_comments where true;
    get diagnostics v_comments = row_count;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.votes where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.post_unlocks where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.saved_posts where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.post_subscriptions where true;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.notifications where true;
  exception
    when undefined_table then null;
  end;

  delete from public.research_posts where true;
  get diagnostics v_posts = row_count;

  update public.hp_transactions
  set comment_id = null
  where comment_id is not null;

  begin
    delete from storage.objects
    where bucket_id = 'research-media';
  exception
    when undefined_table then null;
    when insufficient_privilege then null;
  end;

  raise notice 'Wiped % posts and % comments', v_posts, v_comments;
end;
$$;
`;
