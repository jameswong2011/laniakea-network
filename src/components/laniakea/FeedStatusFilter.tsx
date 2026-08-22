import Link from "next/link";
import {
  DEFAULT_FEED_STATUSES,
  FEED_STATUSES,
  FEED_STATUS_LABELS,
  feedHref,
  feedStatusHref,
  type FeedStatus,
} from "@/lib/research/feed";
import type { SubTopic, Tier } from "@/types";

function chipClassName(active: boolean) {
  return `inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[12px] ${
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
  }`;
}

export function FeedStatusFilter({
  selectedStatuses,
  selectedTopics = null,
  selectedTiers = null,
}: {
  selectedStatuses: FeedStatus[] | null;
  selectedTopics?: SubTopic[] | null;
  selectedTiers?: Tier[] | null;
}) {
  const active = selectedStatuses ?? DEFAULT_FEED_STATUSES;

  return (
    <nav aria-label="Post outcome" className="flex flex-wrap items-center gap-1.5">
      <Link
        href={feedHref({
          topics: selectedTopics,
          tiers: selectedTiers,
          statuses: null,
        })}
        className={chipClassName(selectedStatuses == null)}
      >
        Live tape
      </Link>
      {FEED_STATUSES.map((status) => (
        <Link
          key={status}
          href={feedStatusHref(
            selectedStatuses,
            status,
            selectedTopics,
            selectedTiers
          )}
          className={chipClassName(active.includes(status))}
        >
          {FEED_STATUS_LABELS[status]}
        </Link>
      ))}
    </nav>
  );
}
