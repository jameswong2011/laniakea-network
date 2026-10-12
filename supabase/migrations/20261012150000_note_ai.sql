alter table public.research_posts
  add column if not exists ai_summary text,
  add column if not exists ai_ticker text,
  add column if not exists ai_conviction text,
  add column if not exists ai_claims jsonb not null default '[]'::jsonb,
  add column if not exists ai_risks jsonb not null default '[]'::jsonb,
  add column if not exists ai_comment_agreement text,
  add column if not exists ai_comment_objection text,
  add column if not exists ai_comment_ids text[] not null default '{}';
