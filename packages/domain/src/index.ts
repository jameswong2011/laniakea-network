export const TIERS = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Masters",
] as const;

export type Tier = (typeof TIERS)[number];

export const TIER_LABELS: Record<Tier, string> = {
  Bronze: "Bronze",
  Silver: "Silver",
  Gold: "Gold",
  Platinum: "Platinum",
  Masters: "Masters",
};

export const TIER_RANK: Record<Tier, number> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Platinum: 4,
  Masters: 5,
};

export const RESEARCH_POST_STATUS_LIVE = "live";
export const RESEARCH_POST_STATUS_ARCHIVED = "archived";
export const RESEARCH_POST_STATUS_ASCENDED = "ascended";
export const RESEARCH_POST_STATUS_REFUNDED = "refunded";

export const VOTE_STRENGTH_MIN = 1;
export const VOTE_STRENGTH_MAX = 5;

export function resolveTier(value: string | null | undefined): Tier | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return TIERS.find((tier) => tier.toLowerCase() === normalized) ?? null;
}

export function voteStrength(value: number) {
  return Math.abs(value);
}

export const DEFAULT_STAKE_HP = 10;
export const MAX_STAKE_HP = 100;
export const DEFAULT_COMMENT_STAKE_HP = 5;
export const STARTING_HP = 1000;
export const ASCENT_MULTIPLE = 5;
export const VOTE_COST_HP = 1;
export const VOTE_HEALTH_DELTA = 1;
export const HP_PER_UTILITY_TOKEN = 10;
export const DEFAULT_UTILITY_TOKENS = 100;
export const BUY_HP_CAP = STARTING_HP;
export const MASTERS_CASHOUT_RESERVE_HP = 50;

export function voteCostHp(valueOrStrength: number) {
  return Math.max(VOTE_COST_HP, voteStrength(valueOrStrength));
}

export function voteHealthDelta(value: number) {
  return value * VOTE_HEALTH_DELTA;
}

export function ascentLine(originalStake: number) {
  return ASCENT_MULTIPLE * Math.max(originalStake, 1);
}

export function maxBuyableHp(currentHp: number) {
  return Math.max(0, BUY_HP_CAP - currentHp);
}

export function maxBuyHpTokens(currentHp: number) {
  return Math.floor(maxBuyableHp(currentHp) / HP_PER_UTILITY_TOKEN);
}

export type DeskAccess = "full" | "view_only" | "hidden";

export function nextTier(tier: Tier): Tier | null {
  const rank = TIER_RANK[tier];
  const found = (Object.entries(TIER_RANK) as [Tier, number][]).find(
    ([, value]) => value === rank + 1
  );

  return found?.[0] ?? null;
}

export function canBuyHp(tier: Tier) {
  return tier === "Bronze";
}

export function canCashOutHp(tier: Tier) {
  return tier === "Masters";
}

export function getDeskAccess(
  viewerTier: string | null | undefined,
  authorTier: string | null | undefined,
  isAdmin = false
): DeskAccess {
  if (isAdmin) {
    return "full";
  }

  const viewer = resolveTier(viewerTier);
  const author = resolveTier(authorTier);

  if (!author) {
    return "full";
  }

  const viewerRank = viewer ? TIER_RANK[viewer] : 1;
  const authorRank = TIER_RANK[author];

  if (authorRank <= viewerRank) {
    return "full";
  }

  if (authorRank === viewerRank + 1) {
    return "view_only";
  }

  return "hidden";
}

export function canOpenDesk(access: DeskAccess) {
  return access === "full" || access === "view_only";
}

export function canWriteDesk(access: DeskAccess) {
  return access === "full";
}

export function deskAccessLabel(access: DeskAccess, deskTier?: Tier | null) {
  const desk = deskTier ? ` · ${TIER_LABELS[deskTier]} user` : "";

  if (access === "view_only") {
    return `View only${desk}`;
  }

  if (access === "hidden") {
    return `Locked${desk}`;
  }

  return null;
}

export const POST_HEALTH_DYING_RATIO = 0.05;
export const POST_HEALTH_AT_RISK_RATIO = 0.1;

export type PostHealthState = "healthy" | "at_risk" | "dying";

export function getPostHealthState(
  currentHealth: number,
  originalStake = 100
): PostHealthState {
  const line = ascentLine(originalStake);

  if (currentHealth <= line * POST_HEALTH_DYING_RATIO) {
    return "dying";
  }

  if (currentHealth <= line * POST_HEALTH_AT_RISK_RATIO) {
    return "at_risk";
  }

  return "healthy";
}

export function isAscendedStatus(status?: string | null) {
  return status === RESEARCH_POST_STATUS_ASCENDED;
}

export function isHuntedStatus(status?: string | null) {
  return status === RESEARCH_POST_STATUS_ARCHIVED;
}

export function isRefundedStatus(status?: string | null) {
  return status === RESEARCH_POST_STATUS_REFUNDED;
}

export function getPostHealthLabel(state: PostHealthState) {
  if (state === "dying") {
    return "Dying";
  }

  if (state === "at_risk") {
    return "At risk";
  }

  return "Live";
}

export function getPostHealthPercent(
  currentHealth: number,
  originalStake = 100
) {
  if (currentHealth <= 0) {
    return 0;
  }

  const line = ascentLine(originalStake);
  return Math.min(100, Math.round((currentHealth / line) * 100));
}

export const UNLOCK_BASE_RATES = [1, 5, 25, 200] as const;
export const UNLOCK_RATE_MULTIPLE_MIN = 1;
export const UNLOCK_RATE_MULTIPLE_MAX = 5;
export const DEFAULT_UNLOCK_RATE_MULTIPLE = 1;
export const UNLOCK_AUTHOR_SHARE_PCT = 75;

export type UnlockQuote = {
  steps: number;
  baseTokens: number;
  multiple: number;
  tokens: number;
  authorShare: number;
  burned: number;
};

export function deskStepsAbove(
  viewerTier: string | null | undefined,
  authorTier: string | null | undefined
) {
  const author = resolveTier(authorTier);

  if (!author) {
    return 0;
  }

  const viewer = resolveTier(viewerTier);
  const viewerRank = viewer ? TIER_RANK[viewer] : 1;

  return TIER_RANK[author] - viewerRank;
}

export function unlockBaseTokens(steps: number) {
  if (steps < 1 || steps > UNLOCK_BASE_RATES.length) {
    return null;
  }

  return UNLOCK_BASE_RATES[steps - 1];
}

export function resolveUnlockRateMultiple(value: unknown) {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isInteger(parsed)) {
    return DEFAULT_UNLOCK_RATE_MULTIPLE;
  }

  return Math.min(
    UNLOCK_RATE_MULTIPLE_MAX,
    Math.max(UNLOCK_RATE_MULTIPLE_MIN, parsed)
  );
}

export function splitUnlockProceeds(tokens: number) {
  if (tokens <= 0) {
    return { authorShare: 0, burned: 0 };
  }

  const authorShare = Math.min(
    tokens,
    Math.max(0, Math.floor((tokens * UNLOCK_AUTHOR_SHARE_PCT) / 100))
  );

  return { authorShare, burned: tokens - authorShare };
}

export function quoteDeskUnlock(
  viewerTier: string | null | undefined,
  authorTier: string | null | undefined,
  multiple: unknown
): UnlockQuote | null {
  const steps = deskStepsAbove(viewerTier, authorTier);
  const baseTokens = unlockBaseTokens(steps);

  if (baseTokens == null) {
    return null;
  }

  const rate = resolveUnlockRateMultiple(multiple);
  const tokens = baseTokens * rate;
  const split = splitUnlockProceeds(tokens);

  return {
    steps,
    baseTokens,
    multiple: rate,
    tokens,
    authorShare: split.authorShare,
    burned: split.burned,
  };
}

export function withPaidUnlock(access: DeskAccess, unlocked: boolean): DeskAccess {
  return unlocked ? "full" : access;
}

export function unlockCtaLabel(access: DeskAccess) {
  if (access === "hidden") {
    return "Unlock to read and engage";
  }

  if (access === "view_only") {
    return "Unlock to comment and vote";
  }

  return null;
}

/** Turn a vault note into markdown the readers can render. */
export function prepareNoteMarkdown(source: string) {
  return renderCallouts(renderWikilinks(stripFrontmatter(source))).trim();
}

function stripFrontmatter(source: string) {
  if (!source.startsWith("---")) {
    return source;
  }

  const end = source.indexOf("\n---", 3);
  if (end === -1) {
    return source;
  }

  return source.slice(end + 4);
}

function renderWikilinks(source: string) {
  return source.replace(/\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]/g, (_match, target: string, alias?: string) => {
    const name = (alias ?? target.split("/").pop() ?? target).replace(/\.md$/i, "").trim();
    return name;
  });
}

function renderCallouts(source: string) {
  return source.replace(/^> \[!([A-Za-z]+)\][ \t]*([^\n]*)$/gm, (_match, kind: string, title: string) => {
    const label = kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase();
    const rest = title.trim();
    return rest ? `> **${label}** · ${rest}` : `> **${label}**`;
  });
}

export function researchExcerpt(body: string, max = 220) {
  const compact = prepareNoteMarkdown(body)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/[#*_`>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (compact.length <= max) {
    return compact;
  }

  return `${compact.slice(0, max).trimEnd()}…`;
}

export function feedStatusOf(status: string | null | undefined) {
  if (status === RESEARCH_POST_STATUS_LIVE) {
    return "battleground" as const;
  }

  if (status === RESEARCH_POST_STATUS_ASCENDED) {
    return "ascended" as const;
  }

  if (status === RESEARCH_POST_STATUS_ARCHIVED) {
    return "hunted" as const;
  }

  return null;
}

export const FEED_POSTED = ["today", "week", "month"] as const;
export type FeedPosted = (typeof FEED_POSTED)[number];

export const FEED_POSTED_LABELS: Record<FeedPosted, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
};

export function resolveFeedPosted(value: string | null | undefined): FeedPosted | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return FEED_POSTED.find((posted) => posted === normalized) ?? null;
}

/** Today is local midnight. Week and month roll back from now. */
export function postedSince(posted: FeedPosted, now = new Date()) {
  if (posted === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (posted === "month") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function postedInWindow(
  createdAt: string,
  posted: FeedPosted | null,
  now = new Date()
) {
  if (posted == null) {
    return true;
  }

  const time = new Date(createdAt).getTime();
  return Number.isFinite(time) && time >= postedSince(posted, now).getTime();
}
