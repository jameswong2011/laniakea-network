import { TIER_CODES, TIER_LABELS, resolveTier, type Tier } from "@/types";

const TIER_TONE: Record<
  Tier,
  { frame: string; code: string; divider: string }
> = {
  Bronze: {
    frame: "border-tier-bronze/70 bg-tier-bronze-bg text-tier-bronze",
    code: "bg-tier-bronze/20",
    divider: "border-tier-bronze/50",
  },
  Silver: {
    frame: "border-tier-silver/60 bg-tier-silver-bg text-tier-silver",
    code: "bg-tier-silver/15",
    divider: "border-tier-silver/40",
  },
  Gold: {
    frame: "border-tier-gold/70 bg-tier-gold-bg text-tier-gold",
    code: "bg-tier-gold/20",
    divider: "border-tier-gold/50",
  },
  Platinum: {
    frame: "border-tier-platinum/60 bg-tier-platinum-bg text-tier-platinum",
    code: "bg-tier-platinum/15",
    divider: "border-tier-platinum/40",
  },
  Masters: {
    frame: "border-tier-masters/70 bg-tier-masters-bg text-tier-masters",
    code: "bg-tier-masters/20",
    divider: "border-tier-masters/50",
  },
};

export function TierBadge({
  tier,
  size = "sm",
}: {
  tier: string;
  size?: "sm" | "md";
}) {
  const resolved = resolveTier(tier);
  const compact = size === "sm";

  if (!resolved) {
    return (
      <span
        className={`inline-flex shrink-0 items-center border border-border bg-panel-elevated font-data font-medium tracking-[0.12em] text-muted-foreground uppercase ${
          compact ? "h-6 px-1.5 text-[10px]" : "h-7 px-2 text-[11px]"
        }`}
      >
        {tier || "—"}
      </span>
    );
  }

  const tone = TIER_TONE[resolved];

  return (
    <span
      className={`inline-flex shrink-0 items-stretch overflow-hidden border ${tone.frame} ${
        compact ? "h-6" : "h-7"
      }`}
    >
      <span
        className={`flex items-center font-data font-semibold tracking-[0.08em] ${tone.code} ${
          compact ? "px-1.5 text-[10px]" : "px-2 text-[11px]"
        }`}
      >
        {TIER_CODES[resolved]}
      </span>
      <span
        className={`flex items-center border-l font-data font-medium tracking-[0.12em] uppercase ${tone.divider} ${
          compact ? "px-1.5 text-[10px]" : "px-2 text-[11px]"
        }`}
      >
        {TIER_LABELS[resolved]}
      </span>
    </span>
  );
}
