import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeskAccess, type DeskAccess } from "@/lib/research/access";
import { TIERS, TIER_RANK, type Tier } from "@/types";
import {
  DEFAULT_UNLOCK_RATE_MULTIPLE,
  UNLOCK_AUTHOR_SHARE_PCT,
  UNLOCK_BASE_RATES,
  UNLOCK_RATE_MULTIPLE_MAX,
  UNLOCK_RATE_MULTIPLE_MIN,
  quoteDeskUnlock,
  resolveUnlockRateMultiple,
  unlockCtaLabel,
  withPaidUnlock,
  type UnlockQuote,
} from "@laniakea/domain";

export type { UnlockQuote };
export {
  DEFAULT_UNLOCK_RATE_MULTIPLE,
  UNLOCK_AUTHOR_SHARE_PCT,
  UNLOCK_BASE_RATES,
  UNLOCK_RATE_MULTIPLE_MAX,
  UNLOCK_RATE_MULTIPLE_MIN,
  quoteDeskUnlock,
  resolveUnlockRateMultiple,
  unlockCtaLabel,
  withPaidUnlock,
};

export function unlockQuotesForAuthor(
  authorTier: Tier,
  multiple: unknown
): Array<UnlockQuote & { buyer: Tier }> {
  const rate = resolveUnlockRateMultiple(multiple);
  const authorRank = TIER_RANK[authorTier];

  return TIERS.filter((buyer) => TIER_RANK[buyer] < authorRank).flatMap(
    (buyer) => {
      const quote = quoteDeskUnlock(buyer, authorTier, rate);
      return quote ? [{ ...quote, buyer }] : [];
    }
  );
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
