import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PageFrame } from "@/components/layout/PageFrame";
import { FeedBoard } from "@/components/laniakea/FeedBoard";
import { requireUser } from "@/lib/auth/session";
import { getCommentCounts } from "@/lib/research/comments";
import { VOTE_COST_HP } from "@/lib/research/economy";
import {
  feedHref,
  feedPageHref,
  getLiveResearchFeed,
  getViewerVotes,
  parseFeedBefore,
  parseFeedPosted,
  parseFeedStatuses,
  parseFeedTiers,
  parseFeedTopics,
} from "@/lib/research/feed";
import { loadSavedPostIds } from "@/lib/research/forum";
import { resolveTier } from "@/types";

export const metadata: Metadata = {
  title: "Feed",
};

function timezoneOffset(value: string | undefined) {
  const minutes = Number(value);
  return Number.isFinite(minutes) && Math.abs(minutes) <= 840 ? minutes : 0;
}

export default async function FeedPage({
  searchParams,
}: PageProps<"/feed">) {
  const { topic, tier, status, posted, before } = await searchParams;
  const query = {
    topics: parseFeedTopics(topic),
    tiers: parseFeedTiers(tier),
    statuses: parseFeedStatuses(status),
    posted: parseFeedPosted(posted),
  };
  const cursor = parseFeedBefore(before);
  const [{ supabase, userId, profile }, cookieStore] = await Promise.all([
    requireUser(),
    cookies(),
  ]);
  const deskTier = resolveTier(profile?.tier) ?? "Bronze";
  const { items, error, nextCursor } = await getLiveResearchFeed(
    supabase,
    { userId, tier: deskTier, isAdmin: profile?.role === "admin" },
    { query, before: cursor, timezoneOffset: timezoneOffset(cookieStore.get("tzo")?.value) }
  );
  const ids = items.map((item) => item.id);
  const [viewerVotes, commentCounts, savedIds] = await Promise.all([
    getViewerVotes(supabase, userId, ids),
    getCommentCounts(supabase, ids),
    loadSavedPostIds(supabase, userId, ids),
  ]);
  const feedItems = items.map((item) => ({
    ...item,
    commentCount: commentCounts[item.id] ?? 0,
  }));

  return (
    <PageFrame>
      <FeedBoard
        items={feedItems}
        error={error}
        deskTier={deskTier}
        query={query}
        olderHref={nextCursor ? feedPageHref(query, nextCursor) : null}
        newestHref={cursor ? feedHref(query) : null}
        viewerVotes={viewerVotes}
        savedIds={savedIds}
        canVote={(profile?.current_hp ?? 0) >= VOTE_COST_HP}
        availableHp={profile?.current_hp ?? 0}
        availableTokens={profile?.utility_tokens ?? 0}
      />
    </PageFrame>
  );
}
