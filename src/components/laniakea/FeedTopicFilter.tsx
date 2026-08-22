import { FeedFilterChip, FeedFilterGroup } from "@/components/laniakea/FeedFilterChip";
import { feedHref, feedTopicHref, type FeedStatus } from "@/lib/research/feed";
import { SUB_TOPICS, type SubTopic, type Tier } from "@/types";

export function FeedTopicFilter({
  selected,
  selectedTiers = null,
  selectedStatuses = null,
  onSelect,
}: {
  selected: SubTopic[] | null;
  selectedTiers?: Tier[] | null;
  selectedStatuses?: FeedStatus[] | null;
  onSelect?: (href: string) => void;
}) {
  const allSelected = selected == null;
  const active = selected ?? [...SUB_TOPICS];

  return (
    <FeedFilterGroup
      label="Sector"
      hint="Book the note was filed under."
      tone="sector"
    >
      <nav aria-label="Research sector" className="flex flex-wrap items-center gap-1">
        <FeedFilterChip
          href={feedHref({
            topics: null,
            tiers: selectedTiers,
            statuses: selectedStatuses,
          })}
          active={allSelected}
          onSelect={onSelect}
          className={`inline-flex h-7 shrink-0 items-center px-2 text-[12px] underline-offset-4 ${
            allSelected
              ? "text-foreground underline"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All sectors
        </FeedFilterChip>
        {SUB_TOPICS.map((topic) => {
          const on = active.includes(topic);
          return (
            <FeedFilterChip
              key={topic}
              href={feedTopicHref(selected, topic, selectedTiers, selectedStatuses)}
              active={on}
              onSelect={onSelect}
              className={`inline-flex h-7 shrink-0 items-center px-2 text-[12px] underline-offset-4 ${
                on
                  ? "text-foreground underline"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {topic}
            </FeedFilterChip>
          );
        })}
      </nav>
    </FeedFilterGroup>
  );
}
