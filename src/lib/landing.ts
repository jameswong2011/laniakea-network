import {
  ASCENT_MULTIPLE,
  DEFAULT_COMMENT_STAKE_HP,
  DEFAULT_STAKE_HP,
  MAX_STAKE_HP,
  PASSIVE_DRAIN_HP,
  STARTING_HP,
} from "@/lib/research/economy";
import {
  ASCENT_LONG_SHARE,
  ascentLine,
  ascentMultiplier,
  huntMultiplier,
} from "@/lib/research/settlement";
import { SUB_TOPICS, VOTE_STRENGTH_MAX, VOTE_STRENGTH_MIN } from "@/types";

export const LAYERS = [
  {
    index: "01",
    title: "HP Economy",
    body: "The scarce inventory of attention and conviction. You buy it with mock tokens, stake it, and forfeit it. It is not a score.",
  },
  {
    index: "02",
    title: "Content",
    body: "Long-form notes and staked comments that live or die on a public health bar. Replies are like-only — no HP.",
  },
  {
    index: "03",
    title: "Ranking",
    body: "Bronze to Masters, overall and per topic. The desk one tier above you is view-only. Further desks are hidden.",
  },
  {
    index: "04",
    title: "Topics",
    body: `${SUB_TOPICS.join(", ")}. Topic rank does not transfer. There is also an overall desk.`,
  },
] as const;

export const HP_RULES = [
  { label: "Starting grant", value: `${STARTING_HP} HP` },
  {
    label: "Publish stake",
    value: `1–${MAX_STAKE_HP} HP (default ${DEFAULT_STAKE_HP})`,
  },
  {
    label: "Comment stake",
    value: `1–${MAX_STAKE_HP} HP (default ${DEFAULT_COMMENT_STAKE_HP})`,
  },
  {
    label: "Vote cost",
    value: `${VOTE_STRENGTH_MIN}–${VOTE_STRENGTH_MAX} HP`,
  },
  { label: "Open health", value: "1× stake" },
  { label: "Hunt floor", value: "0" },
  { label: "Ascent ceiling", value: `${ASCENT_MULTIPLE}× stake` },
  { label: "Weekly drain", value: `${PASSIVE_DRAIN_HP} HP` },
] as const;

export const WORKED_STAKE = 100;
export const WORKED_CONVICTION = 5;
export const WORKED_ASCENT_LINE = ascentLine(WORKED_STAKE);
export const WORKED_LONG_SHARE = ASCENT_LONG_SHARE;

export function landingHuntMultiplier(health: number) {
  return huntMultiplier(health, WORKED_STAKE);
}

export function landingAscentMultiplier(health: number) {
  return ascentMultiplier(health, WORKED_STAKE);
}

export function landingHuntClaim(health: number) {
  return WORKED_CONVICTION * landingHuntMultiplier(health);
}

export function landingAscentClaim(health: number) {
  return WORKED_CONVICTION * landingAscentMultiplier(health);
}
