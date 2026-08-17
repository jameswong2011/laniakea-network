-- Continuous hunt/ascent settlement: keep health_at_vote, drop discrete claim tiers.
-- Mirrors src/lib/research/settlement-sql.ts

alter table public.votes
  add column if not exists health_at_vote integer;

alter table public.votes
  drop constraint if exists votes_claim_tier_check;

alter table public.votes
  drop column if exists claim_tier;
