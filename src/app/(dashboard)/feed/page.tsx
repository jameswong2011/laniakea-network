import type { Metadata } from "next";
import { PageFrame } from "@/components/layout/PageFrame";
import { FeedBoard } from "@/components/laniakea/FeedBoard";
import { requireUser } from "@/lib/auth/session";
import { getCommentCounts } from "@/lib/research/comments";
import { VOTE_COST_HP } from "@/lib/research/economy";
import {
  getLiveResearchFeed,
  getViewerVotes,
  parseFeedStatuses,
  parseFeedTiers,
  parseFeedTopics,
} from "@/lib/research/feed";
import { loadSavedPostIds } from "@/lib/research/forum";
import { resolveTier } from "@/types";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage({
  searchParams,
}: PageProps<"/feed">) {
  const { topic, tier, status } = await searchParams;
  const initialQuery = {
    topics: parseFeedTopics(topic),
    tiers: parseFeedTiers(tier),
    statuses: parseFeedStatuses(status),
  };
  const { supabase, userId, profile } = await requireUser();
  const deskTier = resolveTier(profile?.tier) ?? "Bronze";
  const { items, error } = await getLiveResearchFeed(supabase, {
    userId,
    tier: deskTier,
    isAdmin: profile?.role === "admin",
  });
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
        initialQuery={initialQuery}
        viewerVotes={viewerVotes}
        savedIds={[...savedIds]}
        canVote={(profile?.current_hp ?? 0) >= VOTE_COST_HP}
        availableHp={profile?.current_hp ?? 0}
        availableTokens={profile?.utility_tokens ?? 0}
      />
    </PageFrame>
  );
}
