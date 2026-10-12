-- Balances, roles, tiers, note and comment health, votes, the HP ledger, sector ranks and unlocks
-- now change only inside the database functions. Signed-in users keep editing their own profile
-- text and the bodies of their own notes, comments and replies. Reads stay as they were.
-- Run after 20261012221000_balance_functions.sql, once the apps that call those functions are live.
-- Safe to re-run.

do $$
begin
  if to_regprocedure('public.cast_note_vote(uuid, text, integer)') is null
    or to_regprocedure('public.cast_comment_vote(uuid, text, integer)') is null
    or to_regprocedure('public.stake_note(text, text, text, integer, integer)') is null
    or to_regprocedure('public.stake_comment(uuid, text, integer)') is null then
    raise exception 'Run 20261012221000_balance_functions.sql first.';
  end if;
end
$$;

drop policy if exists "Allow all for authenticated users - research_posts" on public.research_posts;
drop policy if exists "Allow all for authenticated users - votes" on public.votes;
drop policy if exists "Allow all for authenticated users - hp_transactions" on public.hp_transactions;
drop policy if exists "Allow all for authenticated - sub_topic_ranks" on public.subtopic_ranks;
drop policy if exists research_comments_update_auth on public.research_comments;
drop policy if exists research_comments_insert_own on public.research_comments;
drop policy if exists comment_votes_insert_own on public.comment_votes;
drop policy if exists post_unlocks_insert_own on public.post_unlocks;

drop policy if exists research_posts_read on public.research_posts;
create policy research_posts_read on public.research_posts
  for select to authenticated using (true);

drop policy if exists research_posts_edit_own on public.research_posts;
create policy research_posts_edit_own on public.research_posts
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists research_comments_edit_own on public.research_comments;
create policy research_comments_edit_own on public.research_comments
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists comment_replies_edit_own on public.comment_replies;
create policy comment_replies_edit_own on public.comment_replies
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists votes_read on public.votes;
create policy votes_read on public.votes
  for select to authenticated using (true);

drop policy if exists hp_transactions_read on public.hp_transactions;
create policy hp_transactions_read on public.hp_transactions
  for select to authenticated using (true);

drop policy if exists subtopic_ranks_read on public.subtopic_ranks;
create policy subtopic_ranks_read on public.subtopic_ranks
  for select to authenticated using (true);

do $$
declare
  target text;
begin
  foreach target in array array[
    'profiles', 'research_posts', 'research_comments', 'votes', 'comment_votes', 'hp_transactions',
    'subtopic_ranks', 'post_unlocks', 'token_ledger', 'revenue_events', 'revenue_distributions', 'invite_codes'
  ]
  loop
    if to_regclass(format('public.%I', target)) is not null then
      execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', target);
    end if;
  end loop;

  if to_regclass('public.comment_replies') is not null then
    revoke update, truncate on public.comment_replies from anon, authenticated;
  end if;
end
$$;

do $$
declare
  wanted record;
  present text;
begin
  for wanted in
    select *
    from (
      values
        ('profiles', array['username', 'display_name', 'bio', 'avatar_url', 'updated_at']),
        ('research_posts', array['body', 'edited_at', 'updated_at']),
        ('research_comments', array['body', 'edited_at', 'updated_at']),
        ('comment_replies', array['body', 'edited_at', 'updated_at'])
    ) as list (table_name, columns)
  loop
    select string_agg(format('%I', c.column_name), ', ' order by c.column_name)
    into present
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = wanted.table_name
      and c.column_name = any (wanted.columns);

    if present is not null then
      execute format('grant update (%s) on public.%I to authenticated', present, wanted.table_name);
    end if;
  end loop;
end
$$;

notify pgrst, 'reload schema';
