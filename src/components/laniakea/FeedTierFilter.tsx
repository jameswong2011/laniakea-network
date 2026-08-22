import Link from "next/link";
import { feedHref, feedTierHref, type FeedStatus } from "@/lib/research/feed";
import { TIERS, type SubTopic, type Tier } from "@/types";

function chipClassName(active: boolean) {
  return `inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[12px] ${
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
  }`;
}

export function FeedTierFilter({
  selectedTiers,
  selectedTopics = null,
  selectedStatuses = null,
}: {
  selectedTiers: Tier[] | null;
  selectedTopics?: SubTopic[] | null;
  selectedStatuses?: FeedStatus[] | null;
}) {
  const allSelected = selectedTiers == null;
  const active = selectedTiers ?? [...TIERS];

  return (
    <nav aria-label="Research tier" className="flex flex-wrap items-center gap-1.5">
      <Link
        href={feedHref({
          topics: selectedTopics,
          tiers: null,
          statuses: selectedStatuses,
        })}
        className={chipClassName(allSelected)}
      >
        All tiers
      </Link>
      {TIERS.map((tier) => (
        <Link
          key={tier}
          href={feedTierHref(
            selectedTiers,
            tier,
            selectedTopics,
            selectedStatuses
          )}
          className={chipClassName(active.includes(tier))}
        >
          {tier}
        </Link>
      ))}
    </nav>
  );
}
