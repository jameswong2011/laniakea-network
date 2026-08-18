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
import {
  INVITE_PURCHASE_UTL,
  REFERRAL_MAX_DEPTH,
  SIGNUP_INVITE_GRANT,
  UNLOCK_CREATOR_SHARE_PCT,
  splitResidual,
  unlockCreatorShare,
  walkReferralKeeps,
} from "@/lib/research/referral";
import { SUB_TOPICS, VOTE_STRENGTH_MAX, VOTE_STRENGTH_MIN } from "@/types";

export const LANIAKEA_PRONUNCIATION = "lah-nee-ah-KAY-ah";

export const AUDIENCES = [
  {
    kicker: "The desk",
    title: "Analysts who should run their own book",
    body: "The 1-CIO / 3–10 PM / 10–50 analyst pyramid is about to invert. Models are becoming A+ public-market analysts — MCP to every data feed, agents that can pilot a machine. The people those seats no longer need are often the ones who can already underwrite a portfolio. We exist so they do not have to die in someone else’s org chart.",
  },
  {
    kicker: "The tape",
    title: "Investors who should stop gambling",
    body: "Self-managed capital has been trained on technicals, options, and the casino. We want them looking over the shoulder of serious research instead — and paying, staking, and voting inside the allocation process, not cheering from a comment section.",
  },
] as const;

export const FLOOR_TRAITS = [
  {
    title: "Long notes, not takes",
    body: "Markdown, images, and threads. Comments can hunt and ascend. Direct replies stay light. Named reactions — Agree, Disagree, Detailed, Non-consensus, Informative — mark the work, not the author.",
  },
  {
    title: "Desks you have to earn",
    body: "Bronze through Masters, overall and by topic. Same desk or below is a full seat. One tier above is view-only. Further desks stay locked until you unlock a note or climb.",
  },
  {
    title: "A library, not just a firehose",
    body: "Follow a desk. Save a thread. Search notes and comments. Draft before you stake. Public profiles so a book has a face.",
  },
] as const;

export const INCENTIVE_POINTS = [
  {
    title: "Curation is the room",
    body: "SumZero, Manual of Ideas, Value Investor Club never solved policing or why a top book would share. We do not hire a curator. The floor spends scarce HP to publish and to vote. Bad work dies in public. Good work climbs.",
  },
  {
    title: "Skin in the thesis",
    body: "A note opens at its stake. The crowd can hunt it to zero or lift it to five times that stake. Settlement is continuous — health at the moment you vote is the multiple. The author and the book share the outcome.",
  },
  {
    title: "Rank is a room, not a badge",
    body: "Weekly calibration, Monday 09:30 New York, promotes and demotes on HP inside each desk and resets the swept book to 1,000 HP. Topic books do not transfer. You cannot buy your way past Bronze’s restore cap.",
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
    label: "Vote conviction",
    value: `${VOTE_STRENGTH_MIN}–${VOTE_STRENGTH_MAX} HP`,
  },
  { label: "Hunt / Ascent", value: `0 floor · ${ASCENT_MULTIPLE}× stake ceiling` },
  { label: "Weekly drain", value: `${PASSIVE_DRAIN_HP} HP · Monday 09:30 NY` },
  { label: "Calibration reset", value: `${STARTING_HP} HP` },
  {
    label: "Buy HP",
    value: `Bronze only · restore to ${STARTING_HP}`,
  },
  {
    label: "Topics",
    value: `${SUB_TOPICS.length} books, overall plus per sector`,
  },
] as const;

export const REFERRAL_STEPS = [
  {
    title: "A code starts the line",
    body: `Public signup starts Bronze. An invite snapshots the inviter’s overall tier at redeem and does not follow them later. Every desk gets ${SIGNUP_INVITE_GRANT} codes. Members buy extras for ${INVITE_PURCHASE_UTL} UTL. Elite desks mint without a cap.`,
  },
  {
    title: "Only UTL spends feed the chain",
    body: `Unlock a note, buy a code, or restore HP. Publish, vote, comment, and the weekly drain stay HP — they do not pay anyone upline. Cash-out credits UTL, so it does not split either.`,
  },
  {
    title: "The poster takes first, then the leftover halves",
    body: `Unlocks send ${UNLOCK_CREATOR_SHARE_PCT}% to the author. Buying a code or restoring HP has no creator. Half of what remains is the referral pool. The other half burns. The odd token burns.`,
  },
  {
    title: "Each ancestor keeps half of what reaches them",
    body: `The walk climbs invited-by, ${REFERRAL_MAX_DEPTH} desks max, no cycles. Keep half, pass the rest. The odd token moves up. Whatever is left at the top of the chain or past depth ${REFERRAL_MAX_DEPTH} is dust. The last desk does not keep the remainder.`,
  },
] as const;

const WORKED_REFERRAL_CHAIN = ["C", "B", "A"] as const;

function quoteReferralSpend(gross: number, creatorShare: number) {
  const residual = Math.max(0, gross - creatorShare);
  const { referralPool, platformBurn } = splitResidual(residual);
  const { keeps, dust } = walkReferralKeeps(
    [...WORKED_REFERRAL_CHAIN],
    referralPool
  );

  return {
    gross,
    creatorShare,
    residual,
    referralPool,
    platformBurn,
    dust,
    keeps: keeps.map((row) => ({
      desk: WORKED_REFERRAL_CHAIN[row.depth - 1] ?? `D${row.depth}`,
      amount: row.amount,
    })),
  };
}

export const WORKED_INVITE_REFERRAL = quoteReferralSpend(INVITE_PURCHASE_UTL, 0);
export const WORKED_UNLOCK_REFERRAL = quoteReferralSpend(
  100,
  unlockCreatorShare(100)
);

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
