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

export const LIFECYCLE = [
  {
    index: "01",
    title: "Stake the note",
    body: `You choose a stake from 1 to ${MAX_STAKE_HP} HP. The default is ${DEFAULT_STAKE_HP}. That inventory becomes the note's opening health.`,
  },
  {
    index: "02",
    title: "The bar opens",
    body: "Health starts at the stake. The room can see the number. There is no quiet launch.",
  },
  {
    index: "03",
    title: "Votes cost inventory",
    body: `Conviction ${VOTE_STRENGTH_MIN}–${VOTE_STRENGTH_MAX} HP, once per note. Health moves by the same amount. No daily cap.`,
  },
  {
    index: "04",
    title: "Settlement is continuous",
    body: `Health to zero is a Hunt. Health to ${ASCENT_MULTIPLE}× stake is an Ascent. The pot is split — not taken by a single closer.`,
  },
  {
    index: "05",
    title: "Calibration",
    body: "Each week the top 25% of a book move up one tier and the bottom 25% move down. Overall and each topic are calibrated separately.",
  },
] as const;

export const LANDING_TIERS = [
  { name: "Bronze", access: "The open floor. Every new desk starts here." },
  { name: "Silver", access: "First closed room. The noise thins." },
  { name: "Gold", access: "Named books, tighter theses, slower speech." },
  { name: "Platinum", access: "Professional cadence. Most of the floor cannot read this far." },
  {
    name: "Masters",
    access: "The top of the ladder. The only desk that can cash out HP.",
  },
] as const;

export const TOPICS = SUB_TOPICS;

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
