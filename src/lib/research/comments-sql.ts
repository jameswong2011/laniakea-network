export const COMMENTS_SQL_TABLES = `-- Comments schema, part 1/2: tables only.
-- Run this first. Safe to re-run.

create table if not exists public.research_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.research_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  status text not null default 'live',
  current_health integer not null,
  original_stake integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_comments_status_check
    check (status in ('live', 'archived', 'ascended', 'refunded')),
  constraint research_comments_body_check
    check (char_length(body) between 1 and 8000),
  constraint research_comments_stake_check
    check (original_stake > 0)
);

create index if not exists research_comments_post_created_idx
  on public.research_comments (post_id, created_at);

create table if not exists public.comment_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment_id uuid not null references public.research_comments (id) on delete cascade,
  value integer not null,
  health_at_vote integer,
  created_at timestamptz not null default now(),
  constraint comment_votes_user_comment_key unique (user_id, comment_id),
  constraint comment_votes_value_check
    check (value <> 0 and abs(value) between 1 and 5)
);

create index if not exists comment_votes_comment_idx
  on public.comment_votes (comment_id);

create table if not exists public.comment_replies (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.research_comments (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comment_replies_body_check
    check (char_length(body) between 1 and 2000)
);

create index if not exists comment_replies_comment_created_idx
  on public.comment_replies (comment_id, created_at);

create table if not exists public.comment_reply_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  reply_id uuid not null references public.comment_replies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, reply_id)
);

create index if not exists comment_reply_likes_reply_idx
  on public.comment_reply_likes (reply_id);
`;

export const COMMENTS_SQL_POLICIES = `-- Comments schema, part 2/2: ledger column, RLS, policies.
-- Run after part 1 succeeds. Safe to re-run.
-- Do not alter hp_transactions with a FK here — that lock order deadlocks
-- against live wallet reads.

alter table public.hp_transactions
  add column if not exists comment_id uuid;

create index if not exists hp_transactions_comment_id_idx
  on public.hp_transactions (comment_id);

alter table public.research_comments enable row level security;
alter table public.comment_votes enable row level security;
alter table public.comment_replies enable row level security;
alter table public.comment_reply_likes enable row level security;

do $$
begin
  create policy research_comments_read
    on public.research_comments
    for select
    to authenticated
    using (true);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy research_comments_insert_own
    on public.research_comments
    for insert
    to authenticated
    with check (auth.uid() = author_id);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy research_comments_update_auth
    on public.research_comments
    for update
    to authenticated
    using (true)
    with check (true);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy research_comments_admin_all
    on public.research_comments
    for all
    to authenticated
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
    with check (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy comment_votes_read
    on public.comment_votes
    for select
    to authenticated
    using (true);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy comment_votes_insert_own
    on public.comment_votes
    for insert
    to authenticated
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy comment_votes_admin_all
    on public.comment_votes
    for all
    to authenticated
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
    with check (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy comment_replies_read
    on public.comment_replies
    for select
    to authenticated
    using (true);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy comment_replies_insert_own
    on public.comment_replies
    for insert
    to authenticated
    with check (auth.uid() = author_id);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy comment_replies_admin_all
    on public.comment_replies
    for all
    to authenticated
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
    with check (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy comment_reply_likes_read
    on public.comment_reply_likes
    for select
    to authenticated
    using (true);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy comment_reply_likes_insert_own
    on public.comment_reply_likes
    for insert
    to authenticated
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy comment_reply_likes_delete_own
    on public.comment_reply_likes
    for delete
    to authenticated
    using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end
$$;

grant select, insert, update on table public.research_comments to authenticated;
grant select, insert on table public.comment_votes to authenticated;
grant select, insert on table public.comment_replies to authenticated;
grant select, insert, delete on table public.comment_reply_likes to authenticated;
`;

export const COMMENTS_SQL = `${COMMENTS_SQL_TABLES}

${COMMENTS_SQL_POLICIES}`;

export const COMMENT_CASCADE_SQL = `-- Parent-hunt cascade: refunded comment status + refund ledger type.
-- Run once after the comments tables exist. Safe to re-run.

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.research_comments'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format(
      'alter table public.research_comments drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

do $$
begin
  alter table public.research_comments
    add constraint research_comments_status_check
    check (status in ('live', 'archived', 'ascended', 'refunded'));
exception
  when duplicate_object then null;
end
$$;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.hp_transactions'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%type%'
  loop
    execute format(
      'alter table public.hp_transactions drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

do $$
begin
  alter table public.hp_transactions
    add constraint hp_transactions_type_check
    check (
      type in (
        'stake',
        'vote',
        'drain',
        'buy',
        'cashout',
        'calibration',
        'hunt',
        'ascent',
        'refund'
      )
    );
exception
  when duplicate_object then null;
end
$$;
`;
