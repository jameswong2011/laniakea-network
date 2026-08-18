import { voteStrength } from "@/types";

export const DEFAULT_STAKE_HP = 10;
export const MAX_STAKE_HP = 100;
export const DEFAULT_COMMENT_STAKE_HP = 5;
export const STARTING_HP = 1000;
/** Voting freezes when health reaches this multiple of original stake. */
export const ASCENT_MULTIPLE = 5;
export const VOTE_COST_HP = 1;
export const VOTE_HEALTH_DELTA = 1;

export function voteCostHp(valueOrStrength: number) {
  return Math.max(VOTE_COST_HP, voteStrength(valueOrStrength));
}

export function voteHealthDelta(value: number) {
  return value * VOTE_HEALTH_DELTA;
}

/** Ascent line for a note: 5 × original stake. */
export function ascentLine(originalStake: number) {
  return ASCENT_MULTIPLE * Math.max(originalStake, 1);
}

export const PASSIVE_DRAIN_HP = 3;
export const WEEKLY_CRON_SCHEDULE = "0 8 * * 1";
export const WEEKLY_CRON_LABEL = "Monday 08:00 UTC";
export const HP_PER_UTILITY_TOKEN = 10;
export const DEFAULT_UTILITY_TOKENS = 100;
export const BUY_HP_CAP = STARTING_HP;

/** Whole HP Bronze can still buy without going above the restore cap. */
export function maxBuyableHp(currentHp: number) {
  return Math.max(0, BUY_HP_CAP - currentHp);
}

/** UTL Bronze can spend (1 UTL = 10 HP) without exceeding the restore cap. */
export function maxBuyHpTokens(currentHp: number) {
  return Math.floor(maxBuyableHp(currentHp) / HP_PER_UTILITY_TOKEN);
}

export const MASTERS_CASHOUT_RESERVE_HP = 50;
export { INVITE_PURCHASE_UTL, SIGNUP_INVITE_GRANT } from "@/lib/research/referral";
