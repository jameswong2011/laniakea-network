-- Feed cards read a short preview of each note, summary refreshes claim the note one at a time,
-- and Ask this note keeps its answers. Safe to re-run.

create or replace function public.body_preview(public.research_posts)
returns text
language sql
stable
as $$
  select left($1.body, 3000)
$$;

grant execute on function public.body_preview(public.research_posts) to authenticated;

alter table public.research_posts
  add column if not exists ai_generated_at timestamptz;

create table if not exists public.ai_answers (
  post_id uuid not null references public.research_posts (id) on delete cascade,
  question_key text not null,
  answer text not null,
  section text not null default 'Summary',
  created_at timestamptz not null default now(),
  primary key (post_id, question_key)
);

-- Only the server's service role reads and writes answers.
alter table public.ai_answers enable row level security;

notify pgrst, 'reload schema';
