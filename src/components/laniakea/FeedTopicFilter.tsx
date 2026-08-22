import Link from "next/link";
import { feedHref, feedTopicHref, type FeedStatus } from "@/lib/research/feed";
import { SUB_TOPICS, type SubTopic, type Tier } from "@/types";

function chipClassName(active: boolean) {
  return `inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[12px] ${
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
  }`;
}

export function FeedTopicFilter({
  selected,
  selectedTiers = null,
  selectedStatuses = null,
}: {
  selected: SubTopic[] | null;
  selectedTiers?: Tier[] | null;
  selectedStatuses?: FeedStatus[] | null;
}) {
  const allSelected = selected == null;
  const active = selected ?? [...SUB_TOPICS];

  return (
    <nav aria-label="Research topic" className="flex flex-wrap items-center gap-1.5">
      <Link
        href={feedHref({
          topics: null,
          tiers: selectedTiers,
          statuses: selectedStatuses,
        })}
        className={chipClassName(allSelected)}
      >
        All
      </Link>
      {SUB_TOPICS.map((topic) => (
        <Link
          key={topic}
          href={feedTopicHref(selected, topic, selectedTiers, selectedStatuses)}
          className={chipClassName(active.includes(topic))}
        >
          {topic}
        </Link>
      ))}
    </nav>
  );
}
