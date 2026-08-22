import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageHeading } from "@/components/layout/PageFrame";
import { FeedStatusFilter } from "@/components/laniakea/FeedStatusFilter";
import { FeedTierFilter } from "@/components/laniakea/FeedTierFilter";
import { FeedTopicFilter } from "@/components/laniakea/FeedTopicFilter";
import { ResearchFeed } from "@/components/laniakea/ResearchFeed";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { getCommentCounts } from "@/lib/research/comments";
import { VOTE_COST_HP } from "@/lib/research/economy";
import {
  FEED_STATUS_LABELS,
  getLiveResearchFeed,
  getViewerVotes,
  itemMatchesFeedStatuses,
  itemMatchesFeedTiers,
  itemMatchesFeedTopics,
  parseFeedStatuses,
  parseFeedTiers,
  parseFeedTopics,
  researchComposePath,
} from "@/lib/research/feed";
import { loadSavedPostIds } from "@/lib/research/forum";
import { resolveTier } from "@/types";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage({
  searchParams,
}: PageProps<"/feed">) {
  const { topic: topicParam, tier: tierParam, status: statusParam } =
    await searchParams;
  const selectedTopics = parseFeedTopics(topicParam);
  const selectedTiers = parseFeedTiers(tierParam);
  const selectedStatuses = parseFeedStatuses(statusParam);
  const { supabase, userId, profile } = await requireUser();
  const deskTier = resolveTier(profile?.tier) ?? "Bronze";
  const { items, error } = await getLiveResearchFeed(supabase, {
    userId,
    tier: deskTier,
    isAdmin: profile?.role === "admin",
  });
  const visibleItems = items.filter(
    (item) =>
      itemMatchesFeedTopics(item, selectedTopics) &&
      itemMatchesFeedTiers(item, selectedTiers) &&
      itemMatchesFeedStatuses(item, selectedStatuses)
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
  const savedIds = await loadSavedPostIds(
    supabase,
    userId,
    feedItems.map((item) => item.id)
  );
  const availableHp = profile?.current_hp ?? 0;

  return (
    <PageFrame>
      <PageHeading
        kicker="Market"
        title={
          selectedTopics?.length === 1 && selectedTiers?.length === 1
            ? `${selectedTiers[0]} · ${selectedTopics[0]}`
            : selectedTopics?.length === 1
              ? selectedTopics[0]
              : selectedTiers?.length === 1
                ? `${selectedTiers[0]} desks`
                : selectedStatuses?.length === 1
                  ? FEED_STATUS_LABELS[selectedStatuses[0]]
                  : "Main Feed"
        }
        description="Read, vote, and comment. Lower desks can unlock a higher note with UTL."
        meta={
          <>
            <TierBadge tier={deskTier} size="md" />
            <span className="text-[13px] text-muted-foreground">
              {feedItems.length} notes
            </span>
            <Link
              href={researchComposePath()}
              className="inline-flex h-9 items-center rounded-md bg-secondary px-3 text-[13px] font-medium text-foreground hover:bg-muted"
            >
              New post
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-2">
        <FeedStatusFilter
          selectedStatuses={selectedStatuses}
          selectedTopics={selectedTopics}
          selectedTiers={selectedTiers}
        />
        <FeedTierFilter
          selectedTiers={selectedTiers}
          selectedTopics={selectedTopics}
          selectedStatuses={selectedStatuses}
        />
        <FeedTopicFilter
          selected={selectedTopics}
          selectedTiers={selectedTiers}
          selectedStatuses={selectedStatuses}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-border bg-panel px-4 py-3 text-[14px] text-loss">
          {error}
        </p>
      ) : selectedTopics?.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel px-5 py-8 text-[15px] text-muted-foreground">
          Select at least one sub-topic.
        </p>
      ) : selectedTiers?.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel px-5 py-8 text-[15px] text-muted-foreground">
          Select at least one research tier.
        </p>
      ) : selectedStatuses?.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel px-5 py-8 text-[15px] text-muted-foreground">
          Select battleground, ascended, or hunted.
        </p>
      ) : (
        <ResearchFeed
          items={feedItems}
          viewerVotes={viewerVotes}
          canVote={availableHp >= VOTE_COST_HP}
          availableHp={availableHp}
          availableTokens={profile?.utility_tokens ?? 0}
          savedIds={savedIds}
        />
      )}
    </PageFrame>
  );
}
