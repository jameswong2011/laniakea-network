export const FORUM_SOCIAL_SQL = `-- Forum social: reactions, saves, subscriptions, notifications, media.
-- Safe to re-run. Hunt / Ascent / vote HP math is unchanged.

alter table public.research_posts
  add column if not exists edited_at timestamptz;

alter table public.research_comments
  add column if not exists edited_at timestamptz;

alter table public.comment_replies
  add column if not exists updated_at timestamptz,
  add column if not exists edited_at timestamptz;

create table if not exists public.content_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'reply')),
  target_id uuid not null,
  reaction text not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, reaction)
);

create index if not exists content_reactions_target_idx
  on public.content_reactions (target_type, target_id);

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.research_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.post_subscriptions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.research_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('comment_on_post', 'reply_to_comment')),
  post_id uuid references public.research_posts (id) on delete cascade,
  comment_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.content_reactions enable row level security;
alter table public.saved_posts enable row level security;
alter table public.post_subscriptions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists content_reactions_read on public.content_reactions;
create policy content_reactions_read on public.content_reactions
  for select to authenticated using (true);

drop policy if exists content_reactions_write on public.content_reactions;
create policy content_reactions_write on public.content_reactions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists content_reactions_delete on public.content_reactions;
create policy content_reactions_delete on public.content_reactions
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists saved_posts_own on public.saved_posts;
create policy saved_posts_own on public.saved_posts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists post_subscriptions_own on public.post_subscriptions;
create policy post_subscriptions_own on public.post_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated with check (actor_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'research-media',
  'research-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists research_media_read on storage.objects;
create policy research_media_read on storage.objects
  for select to public
  using (bucket_id = 'research-media');

drop policy if exists research_media_insert on storage.objects;
create policy research_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'research-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists research_media_delete on storage.objects;
create policy research_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'research-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists research_media_update on storage.objects;
create policy research_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'research-media'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'research-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );
`;
