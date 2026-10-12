-- A failed AI call keeps a short retry cooldown without pretending that the saved summary is fresh.
-- Successful generation still records ai_generated_at. Safe to re-run.

alter table public.research_posts
  add column if not exists ai_brief_attempted_at timestamptz;

notify pgrst, 'reload schema';
