import { FeedFilterChip, FeedFilterGroup } from "@/components/laniakea/FeedFilterChip";
import { feedHref, feedTierHref, type FeedStatus } from "@/lib/research/feed";
import { TIER_CODES, TIERS, type SubTopic, type Tier } from "@/types";

const TIER_TONE: Record<Tier, { on: string; off: string }> = {
  Bronze: {
    on: "border-tier-bronze/70 bg-tier-bronze-bg text-tier-bronze",
    off: "border-transparent text-muted-foreground hover:border-tier-bronze/40 hover:text-tier-bronze",
  },
  Silver: {
    on: "border-tier-silver/60 bg-tier-silver-bg text-tier-silver",
    off: "border-transparent text-muted-foreground hover:border-tier-silver/40 hover:text-tier-silver",
  },
  Gold: {
    on: "border-tier-gold/70 bg-tier-gold-bg text-tier-gold",
    off: "border-transparent text-muted-foreground hover:border-tier-gold/40 hover:text-tier-gold",
  },
  Platinum: {
    on: "border-tier-platinum/60 bg-tier-platinum-bg text-tier-platinum",
    off: "border-transparent text-muted-foreground hover:border-tier-platinum/40 hover:text-tier-platinum",
  },
  Masters: {
    on: "border-tier-masters/70 bg-tier-masters-bg text-tier-masters",
    off: "border-transparent text-muted-foreground hover:border-tier-masters/40 hover:text-tier-masters",
  },
};

export function FeedTierFilter({
  selectedTiers,
  selectedTopics = null,
  selectedStatuses = null,
  onSelect,
}: {
  selectedTiers: Tier[] | null;
  selectedTopics?: SubTopic[] | null;
  selectedStatuses?: FeedStatus[] | null;
  onSelect?: (href: string) => void;
}) {
  const allSelected = selectedTiers == null;
  const active = selectedTiers ?? [...TIERS];

  return (
    <FeedFilterGroup
      label="Desk"
      hint="Author overall tier, not the topic book."
      tone="desk"
    >
      <nav aria-label="Research tier" className="flex flex-wrap items-center gap-1.5">
        <FeedFilterChip
          href={feedHref({
            topics: selectedTopics,
            tiers: null,
            statuses: selectedStatuses,
          })}
          active={allSelected}
          onSelect={onSelect}
          className={`inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 font-data text-[11px] tracking-[0.08em] ${
            allSelected
              ? "border-foreground/20 bg-muted text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          All
        </FeedFilterChip>
        {TIERS.map((tier) => {
          const on = active.includes(tier);
          return (
            <FeedFilterChip
              key={tier}
              href={feedTierHref(
                selectedTiers,
                tier,
                selectedTopics,
                selectedStatuses
              )}
              active={on}
              onSelect={onSelect}
              className={`inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 font-data text-[11px] tracking-[0.08em] ${
                on ? TIER_TONE[tier].on : TIER_TONE[tier].off
              }`}
            >
              {TIER_CODES[tier]}
            </FeedFilterChip>
          );
        })}
      </nav>
    </FeedFilterGroup>
  );
}
