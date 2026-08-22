"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeading } from "@/components/layout/PageFrame";
import { FeedStatusFilter } from "@/components/laniakea/FeedStatusFilter";
import { FeedTierFilter } from "@/components/laniakea/FeedTierFilter";
import { FeedTopicFilter } from "@/components/laniakea/FeedTopicFilter";
import { ResearchFeed } from "@/components/laniakea/ResearchFeed";
import { TierBadge } from "@/components/laniakea/TierBadge";
import {
  feedHeadingTitle,
  itemMatchesFeedStatuses,
  itemMatchesFeedTiers,
  itemMatchesFeedTopics,
  parseFeedQueryFromHref,
  researchComposePath,
  type FeedQuery,
} from "@/lib/research/feed";
import type { ResearchFeedItem, Tier } from "@/types";

export function FeedBoard({
  items,
  error,
  deskTier,
  initialQuery,
  viewerVotes,
  savedIds,
  canVote,
  availableHp,
  availableTokens,
}: {
  items: ResearchFeedItem[];
  error: string | null;
  deskTier: Tier;
  initialQuery: FeedQuery;
  viewerVotes: Record<string, number>;
  savedIds: string[];
  canVote: boolean;
  availableHp: number;
  availableTokens: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const saved = useMemo(() => new Set(savedIds), [savedIds]);

  useEffect(() => {
    function onPop() {
      setQuery(parseFeedQueryFromHref(window.location.href));
    }

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function apply(href: string) {
    setQuery(parseFeedQueryFromHref(href));
    window.history.pushState(window.history.state, "", href);
  }

  const visibleItems = items.filter(
    (item) =>
      itemMatchesFeedTopics(item, query.topics) &&
      itemMatchesFeedTiers(item, query.tiers) &&
      itemMatchesFeedStatuses(item, query.statuses)
  );

  return (
    <>
      <PageHeading
        kicker="Market"
        title={feedHeadingTitle(query)}
        description="Read, vote, and comment. Lower desks can unlock a higher note with UTL."
        meta={
          <>
            <TierBadge tier={deskTier} size="md" />
            <span className="text-[13px] text-muted-foreground">
              {visibleItems.length} notes
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
          onSelect={apply}
        />
        <FeedTierFilter
          selectedTiers={query.tiers}
          selectedTopics={query.topics}
          selectedStatuses={query.statuses}
          onSelect={apply}
        />
        <FeedTopicFilter
          selected={query.topics}
          selectedTiers={query.tiers}
          selectedStatuses={query.statuses}
          onSelect={apply}
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
          Select at least one desk.
        </p>
      ) : query.statuses?.length === 0 ? (
        <p className="rounded-xl border border-border bg-panel px-5 py-8 text-[15px] text-muted-foreground">
          Select battleground, ascended, or hunted.
        </p>
      ) : (
        <ResearchFeed
          items={visibleItems}
          viewerVotes={viewerVotes}
          canVote={canVote}
          availableHp={availableHp}
          availableTokens={availableTokens}
          savedIds={saved}
        />
      )}
    </>
  );
}
