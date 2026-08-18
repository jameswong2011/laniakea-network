export const FORUM_DISCOVERY_SQL = `-- Author follow, drafts, user bio. Safe to re-run.
-- Requires 20260818160000_forum_social.sql first.

alter table public.profiles
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_bio_len;

alter table public.profiles
  add constraint profiles_bio_len
  check (bio is null or char_length(bio) <= 500);

create table if not exists public.author_subscriptions (
  subscriber_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, author_id),
  check (subscriber_id <> author_id)
);

create index if not exists author_subscriptions_author_idx
  on public.author_subscriptions (author_id);

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('post', 'comment')),
  post_id uuid references public.research_posts (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  sub_topic text,
  stake_hp integer,
  unlock_rate_multiple integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_drafts_one_comment
  on public.content_drafts (user_id, post_id)
  where kind = 'comment';

create index if not exists content_drafts_user_idx
  on public.content_drafts (user_id, updated_at desc);

do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.notifications'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%kind%';

  if cname is not null then
    execute format('alter table public.notifications drop constraint %I', cname);
  end if;
end $$;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('comment_on_post', 'reply_to_comment', 'author_post'));

alter table public.author_subscriptions enable row level security;
alter table public.content_drafts enable row level security;

drop policy if exists author_subscriptions_read on public.author_subscriptions;
create policy author_subscriptions_read on public.author_subscriptions
  for select to authenticated using (true);

drop policy if exists author_subscriptions_write on public.author_subscriptions;
create policy author_subscriptions_write on public.author_subscriptions
  for insert to authenticated
  with check (subscriber_id = auth.uid() and subscriber_id <> author_id);

drop policy if exists author_subscriptions_delete on public.author_subscriptions;
create policy author_subscriptions_delete on public.author_subscriptions
  for delete to authenticated using (subscriber_id = auth.uid());

drop policy if exists content_drafts_own on public.content_drafts;
create policy content_drafts_own on public.content_drafts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
`;
