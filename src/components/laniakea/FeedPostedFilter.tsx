import { FeedFilterChip, FeedFilterGroup } from "@/components/laniakea/FeedFilterChip";
import {
  FEED_POSTED_LABELS,
  feedHref,
  type FeedPosted,
  type FeedStatus,
} from "@/lib/research/feed";
import type { SubTopic, Tier } from "@/types";

const WINDOWS: FeedPosted[] = ["today", "week", "month"];

export function FeedPostedFilter({
  selectedPosted,
  selectedTopics = null,
  selectedTiers = null,
  selectedStatuses = null,
  onSelect,
}: {
  selectedPosted: FeedPosted | null;
  selectedTopics?: SubTopic[] | null;
  selectedTiers?: Tier[] | null;
  selectedStatuses?: FeedStatus[] | null;
  onSelect?: (href: string) => void;
}) {
  return (
    <FeedFilterGroup label="Posted" hint="This week is the last 7 days. This month is the last 30 days." tone="outcome">
      <nav aria-label="Posted" className="flex flex-wrap items-center gap-1.5">
        <FeedFilterChip
          href={feedHref({
            topics: selectedTopics,
            tiers: selectedTiers,
            statuses: selectedStatuses,
            posted: null,
          })}
          active={selectedPosted == null}
          onSelect={onSelect}
          className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-[12px] ${
            selectedPosted == null
              ? "border-foreground/20 bg-muted text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          Any time
        </FeedFilterChip>
        {WINDOWS.map((posted) => {
          const on = selectedPosted === posted;
          return (
            <FeedFilterChip
              key={posted}
              href={feedHref({
                topics: selectedTopics,
                tiers: selectedTiers,
                statuses: selectedStatuses,
                posted,
              })}
              active={on}
              onSelect={onSelect}
              className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-[12px] ${
                on
                  ? "border-foreground/20 bg-muted text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              {FEED_POSTED_LABELS[posted]}
            </FeedFilterChip>
          );
        })}
      </nav>
    </FeedFilterGroup>
  );
}
