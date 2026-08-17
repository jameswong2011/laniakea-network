-- Tranche 1: sub-topics, per-topic ranks, and wallet post links.
-- Run this once in the Supabase SQL editor if the CLI is not linked.

alter table public.research_posts
  add column if not exists sub_topic text;

update public.research_posts
set sub_topic = 'Macro'
where sub_topic is null;

alter table public.research_posts
  alter column sub_topic set default 'Macro';

alter table public.research_posts
  alter column sub_topic set not null;

do $$
begin
  alter table public.research_posts
    add constraint research_posts_sub_topic_check
    check (
      sub_topic in (
        'Healthcare',
        'Banks',
        'Cybersecurity',
        'Technology',
        'Macro',
        'Energy'
      )
    );
exception
  when duplicate_object then null;
end
$$;

alter table public.hp_transactions
  add column if not exists post_id uuid references public.research_posts (id) on delete set null;

create table if not exists public.subtopic_ranks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  sub_topic text not null,
  tier text not null default 'Bronze',
  current_hp integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, sub_topic),
  constraint subtopic_ranks_sub_topic_check
    check (
      sub_topic in (
        'Healthcare',
        'Banks',
        'Cybersecurity',
        'Technology',
        'Macro',
        'Energy'
      )
    ),
  constraint subtopic_ranks_tier_check
    check (tier in ('Bronze', 'Silver', 'Gold', 'Platinum', 'Masters'))
);

create index if not exists subtopic_ranks_topic_hp_idx
  on public.subtopic_ranks (sub_topic, current_hp desc);

create index if not exists hp_transactions_user_created_idx
  on public.hp_transactions (user_id, created_at desc);

create index if not exists hp_transactions_post_id_idx
  on public.hp_transactions (post_id);

alter table public.subtopic_ranks enable row level security;

do $$
begin
  create policy subtopic_ranks_read
    on public.subtopic_ranks
    for select
    to authenticated
    using (true);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy subtopic_ranks_insert_own
    on public.subtopic_ranks
    for insert
    to authenticated
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy subtopic_ranks_update_own
    on public.subtopic_ranks
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy subtopic_ranks_admin_all
    on public.subtopic_ranks
    for all
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    );
exception
  when duplicate_object then null;
end
$$;

grant select, insert, update on table public.subtopic_ranks to authenticated;
