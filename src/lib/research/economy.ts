export {
  ASCENT_MULTIPLE,
  BUY_HP_CAP,
  DEFAULT_COMMENT_STAKE_HP,
  DEFAULT_STAKE_HP,
  DEFAULT_UTILITY_TOKENS,
  HP_PER_UTILITY_TOKEN,
  MASTERS_CASHOUT_RESERVE_HP,
  MAX_STAKE_HP,
  STARTING_HP,
  VOTE_COST_HP,
  VOTE_HEALTH_DELTA,
  ascentLine,
  maxBuyHpTokens,
  maxBuyableHp,
  voteCostHp,
  voteHealthDelta,
} from "@laniakea/domain";

export const PASSIVE_DRAIN_HP = 3;
/** Vercel UTC slots that cover 09:30 America/New_York in EDT and EST. */
export const WEEKLY_CRON_SCHEDULE = "30 13 * * 1";
export const WEEKLY_CRON_SCHEDULE_EST = "30 14 * * 1";
export const WEEKLY_CRON_TIMEZONE = "America/New_York";
export const WEEKLY_CRON_LABEL = "Monday 09:30 New York";

export function isWeeklyCronWindow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WEEKLY_CRON_TIMEZONE,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return weekday === "Mon" && hour === 9 && minute >= 30 && minute <= 34;
}
export { INVITE_PURCHASE_UTL, SIGNUP_INVITE_GRANT } from "@/lib/research/referral";
