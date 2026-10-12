import Link from "next/link";
import { TierIcon } from "@/components/laniakea/TierIcon";
import { TIERS, type Tier } from "@/types";

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

export function RankingTierNav({ selected }: { selected: Tier | null }) {
  const tiers = [...TIERS].reverse();

  return (
    <nav aria-label="Research tier" className="flex flex-wrap items-center gap-1.5">
      <Link
        href="/ranking"
        className={`inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-solid px-3 text-[13px] font-medium ${
          selected == null
            ? "border-foreground/20 bg-muted text-foreground"
            : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        }`}
      >
        All
      </Link>
      {tiers.map((tier) => {
        const on = selected === tier;
        return (
          <Link
            key={tier}
            href={`/ranking?tier=${encodeURIComponent(tier)}`}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-solid px-3 text-[13px] font-medium ${
              on ? TIER_TONE[tier].on : TIER_TONE[tier].off
            }`}
          >
            <TierIcon tier={tier} size={12} />
            {tier}
          </Link>
        );
      })}
    </nav>
  );
}
