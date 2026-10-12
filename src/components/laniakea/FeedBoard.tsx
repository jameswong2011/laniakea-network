import Link from "next/link";
import { PageHeading } from "@/components/layout/PageFrame";
import { FeedPostedFilter } from "@/components/laniakea/FeedPostedFilter";
import { FeedStatusFilter } from "@/components/laniakea/FeedStatusFilter";
import { FeedTierFilter } from "@/components/laniakea/FeedTierFilter";
import { FeedTopicFilter } from "@/components/laniakea/FeedTopicFilter";
import { LinkPending } from "@/components/laniakea/LinkPending";
import { ResearchFeed } from "@/components/laniakea/ResearchFeed";
import { TierBadge } from "@/components/laniakea/TierBadge";
import {
  feedHeadingTitle,
  researchComposePath,
  type FeedQuery,
} from "@/lib/research/feed";
import type { ResearchFeedItem, Tier } from "@/types";

const pageLinkClassName =
  "relative inline-flex h-9 items-center rounded-md border border-border bg-secondary px-3 text-[13px] font-medium text-foreground hover:bg-muted";

export function FeedBoard({
  items,
  error,
  deskTier,
  query,
  olderHref,
  newestHref,
  viewerVotes,
  savedIds,
  canVote,
  availableHp,
  availableTokens,
}: {
  items: ResearchFeedItem[];
  error: string | null;
  deskTier: Tier;
  query: FeedQuery;
  olderHref: string | null;
  newestHref: string | null;
  viewerVotes: Record<string, number>;
  savedIds: Set<string>;
  canVote: boolean;
  availableHp: number;
  availableTokens: number;
}) {
  return (
    <>
      <PageHeading
        kicker="Market"
        title={feedHeadingTitle(query)}
        description="Read, vote, and comment. Lower users can unlock a higher note with UTL."
        meta={
          <>
            <TierBadge tier={deskTier} size="md" />
            <span className="text-[13px] text-muted-foreground">
              {items.length}
              {olderHref ? "+" : ""} notes
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

      <div className="flex flex-col gap-3">
        <FeedStatusFilter
          selectedStatuses={query.statuses}
          selectedTopics={query.topics}
          selectedTiers={query.tiers}
          selectedPosted={query.posted}
        />
        <FeedPostedFilter
          selectedPosted={query.posted}
          selectedTopics={query.topics}
          selectedTiers={query.tiers}
          selectedStatuses={query.statuses}
        />
        <FeedTierFilter
          selectedTiers={query.tiers}
          selectedTopics={query.topics}
          selectedStatuses={query.statuses}
          selectedPosted={query.posted}
        />
        <FeedTopicFilter
          selected={query.topics}
          selectedTiers={query.tiers}
          selectedStatuses={query.statuses}
          selectedPosted={query.posted}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-border bg-panel px-4 py-3 text-[14px] text-loss">
          {error}
        </p>
      ) : query.topics?.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel px-5 py-8 text-[15px] text-muted-foreground">
          Select at least one sector.
        </p>
      ) : query.tiers?.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel px-5 py-8 text-[15px] text-muted-foreground">
          Select at least one user.
        </p>
      ) : query.statuses?.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel px-5 py-8 text-[15px] text-muted-foreground">
          Select battleground, ascended, or hunted.
        </p>
      ) : (
        <>
          <ResearchFeed
            items={items}
            viewerVotes={viewerVotes}
            canVote={canVote}
            availableHp={availableHp}
            availableTokens={availableTokens}
            savedIds={savedIds}
          />
          {olderHref || newestHref ? (
            <nav aria-label="Feed pages" className="flex items-center justify-between gap-3">
              {newestHref ? (
                <Link href={newestHref} className={pageLinkClassName}>
                  Newest notes
                  <LinkPending />
                </Link>
              ) : (
                <span />
              )}
              {olderHref ? (
                <Link href={olderHref} className={pageLinkClassName}>
                  Older notes
                  <LinkPending />
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
