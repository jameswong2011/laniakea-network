import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageHeading } from "@/components/layout/PageFrame";
import { FeedTopicFilter } from "@/components/laniakea/FeedTopicFilter";
import { ResearchFeed } from "@/components/laniakea/ResearchFeed";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { getCommentCounts } from "@/lib/research/comments";
import { VOTE_COST_HP } from "@/lib/research/economy";
import {
  getLiveResearchFeed,
  getViewerVotes,
  itemMatchesFeedTopics,
  parseFeedTopics,
  researchComposePath,
} from "@/lib/research/feed";
import { resolveTier } from "@/types";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage({
  searchParams,
}: PageProps<"/feed">) {
  const { topic: topicParam } = await searchParams;
  const selectedTopics = parseFeedTopics(topicParam);
  const { supabase, userId, profile } = await requireUser();
  const deskTier = resolveTier(profile?.tier) ?? "Bronze";
  const { items, error } = await getLiveResearchFeed(supabase, {
    tier: deskTier,
    isAdmin: profile?.role === "admin",
  });
  const visibleItems = items.filter((item) =>
    itemMatchesFeedTopics(item, selectedTopics)
  );
  const viewerVotes = await getViewerVotes(
    supabase,
    userId,
    visibleItems.map((item) => item.id)
  );
  const commentCounts = await getCommentCounts(
    supabase,
    visibleItems.map((item) => item.id)
  );
  const feedItems = visibleItems.map((item) => ({
    ...item,
    commentCount: commentCounts[item.id] ?? 0,
  }));
  const availableHp = profile?.current_hp ?? 0;

  return (
    <PageFrame>
      <PageHeading
        kicker="Market"
        title="Research Feed"
        description="Open a thread to read, vote, and comment."
        meta={
          <>
            <TierBadge tier={deskTier} size="md" />
            <span className="font-data text-[11px] text-muted-foreground">
              {feedItems.length} live
            </span>
            <Link
              href={researchComposePath()}
              className="inline-flex h-7 items-center border border-border bg-secondary px-2.5 font-data text-[10px] tracking-[0.14em] text-foreground uppercase hover:bg-muted"
            >
              New Research Post
            </Link>
          </>
        }
      />

      <FeedTopicFilter selected={selectedTopics} />

      {error ? (
        <p className="border border-border bg-panel px-2.5 py-3 font-data text-[12px] text-loss">
          {error}
        </p>
      ) : selectedTopics?.length === 0 ? (
        <p className="border border-border bg-panel px-2.5 py-5 font-data text-[12px] text-muted-foreground">
          Select at least one sub-topic.
        </p>
      ) : (
        <ResearchFeed
          items={feedItems}
          viewerVotes={viewerVotes}
          canVote={availableHp >= VOTE_COST_HP}
          availableHp={availableHp}
        />
      )}
    </PageFrame>
  );
}
