-- Admin reads model use. Inserts come from the service role.

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  feature text not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_created_idx
  on public.ai_usage (created_at desc);

create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists ai_usage_admin_read on public.ai_usage;

create policy ai_usage_admin_read
  on public.ai_usage
  for select
  to authenticated
  using (public.is_admin());
