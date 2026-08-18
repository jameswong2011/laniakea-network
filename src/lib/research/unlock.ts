import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeskAccess, type DeskAccess } from "@/lib/research/access";
import {
  TIERS,
  TIER_RANK,
  resolveTier,
  type Tier,
  type UnlockQuote,
} from "@/types";

export type { UnlockQuote };

/** Bronze → Silver / Gold / Platinum / Masters. Same steps for every buyer. */
export const UNLOCK_BASE_RATES = [1, 5, 25, 200] as const;
export const UNLOCK_RATE_MULTIPLE_MIN = 1;
export const UNLOCK_RATE_MULTIPLE_MAX = 5;
export const DEFAULT_UNLOCK_RATE_MULTIPLE = 1;
export const UNLOCK_AUTHOR_SHARE_PCT = 75;

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

export function unlockQuotesForAuthor(
  authorTier: Tier,
  multiple: unknown
): Array<UnlockQuote & { buyer: Tier }> {
  const rate = resolveUnlockRateMultiple(multiple);
  const authorRank = TIER_RANK[authorTier];

  return TIERS
    .filter((buyer) => TIER_RANK[buyer] < authorRank)
    .flatMap((buyer) => {
      const quote = quoteDeskUnlock(buyer, authorTier, rate);
      return quote ? [{ ...quote, buyer }] : [];
    });
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

export function isMissingUnlockSchema(message: string) {
  const missingObject =
    message.includes("does not exist") ||
    message.includes("42703") ||
    message.includes("42P01") ||
    message.includes("42883");

  return (
    missingObject &&
    (message.includes("post_unlocks") ||
      message.includes("unlock_rate_multiple") ||
      message.includes("purchase_post_unlock") ||
      message.includes("tier_rank"))
  );
}

export function missingUnlockSchemaMessage() {
  return "Desk unlocks need a one-time schema update. Run the Desk unlock SQL on Admin, then refresh.";
}

export async function loadViewerUnlockIds(
  supabase: SupabaseClient,
  userId: string | undefined,
  postIds: string[]
): Promise<Set<string>> {
  if (!userId || postIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("post_unlocks")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) {
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.post_id as string));
}

export async function viewerHasPostUnlock(
  supabase: SupabaseClient,
  userId: string,
  postId: string
) {
  const ids = await loadViewerUnlockIds(supabase, userId, [postId]);
  return ids.has(postId);
}

export async function resolvePostDeskAccess(
  supabase: SupabaseClient,
  params: {
    postId: string;
    viewerId?: string | null;
    viewerTier?: string | null;
    authorTier?: string | null;
    isAdmin?: boolean;
  }
): Promise<DeskAccess> {
  const base = getDeskAccess(
    params.viewerTier,
    params.authorTier,
    params.isAdmin ?? false
  );

  if (base === "full" || !params.viewerId) {
    return base;
  }

  const unlocked = await viewerHasPostUnlock(
    supabase,
    params.viewerId,
    params.postId
  );

  return withPaidUnlock(base, unlocked);
}
