import { FeedFilterChip, FeedFilterGroup } from "@/components/laniakea/FeedFilterChip";
import {
  DEFAULT_FEED_STATUSES,
  FEED_STATUSES,
  FEED_STATUS_LABELS,
  feedHref,
  feedStatusHref,
  type FeedStatus,
} from "@/lib/research/feed";
import type { SubTopic, Tier } from "@/types";

const STATUS_TONE: Record<FeedStatus, { on: string; off: string }> = {
  battleground: {
    on: "border-warning/60 bg-warning-muted text-warning",
    off: "border-transparent text-muted-foreground hover:border-warning/40 hover:text-warning",
  },
  ascended: {
    on: "border-gain/50 bg-gain-muted text-gain",
    off: "border-transparent text-muted-foreground hover:border-gain/40 hover:text-gain",
  },
  hunted: {
    on: "border-loss/50 bg-loss-muted text-loss",
    off: "border-transparent text-muted-foreground hover:border-loss/40 hover:text-loss",
  },
};

function statusChipClass(active: boolean, status?: FeedStatus) {
  const tone = status ? STATUS_TONE[status] : null;
  return `inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-md border px-2.5 text-[12px] ${
    tone
      ? active
        ? tone.on
        : tone.off
      : active
        ? "border-foreground/20 bg-muted text-foreground"
        : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
  }`;
}

export function FeedStatusFilter({
  selectedStatuses,
  selectedTopics = null,
  selectedTiers = null,
  onSelect,
}: {
  selectedStatuses: FeedStatus[] | null;
  selectedTopics?: SubTopic[] | null;
  selectedTiers?: Tier[] | null;
  onSelect?: (href: string) => void;
}) {
  const active = selectedStatuses ?? DEFAULT_FEED_STATUSES;

  return (
    <FeedFilterGroup
      label="Outcome"
      hint="Battleground is live. Hunted and ascended are settled."
      tone="outcome"
    >
      <nav aria-label="Post outcome" className="flex flex-wrap items-center gap-1.5">
        <FeedFilterChip
          href={feedHref({
            topics: selectedTopics,
            tiers: selectedTiers,
            statuses: null,
          })}
          active={selectedStatuses == null}
          onSelect={onSelect}
          className={statusChipClass(selectedStatuses == null)}
        >
          Live tape
        </FeedFilterChip>
        {FEED_STATUSES.map((status) => (
          <FeedFilterChip
            key={status}
            href={feedStatusHref(
              selectedStatuses,
              status,
              selectedTopics,
              selectedTiers
            )}
            active={active.includes(status)}
            onSelect={onSelect}
            className={statusChipClass(active.includes(status), status)}
          >
            {FEED_STATUS_LABELS[status]}
          </FeedFilterChip>
        ))}
      </nav>
    </FeedFilterGroup>
  );
}
