import { TIER_LABELS, resolveTier, type Tier } from "@/types";

const TIER_TONE: Record<Tier, string> = {
  Bronze: "border-tier-bronze/70 bg-tier-bronze-bg text-tier-bronze",
  Silver: "border-tier-silver/60 bg-tier-silver-bg text-tier-silver",
  Gold: "border-tier-gold/70 bg-tier-gold-bg text-tier-gold",
  Platinum: "border-tier-platinum/60 bg-tier-platinum-bg text-tier-platinum",
  Masters: "border-tier-masters/70 bg-tier-masters-bg text-tier-masters",
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
  const frame = resolved
    ? TIER_TONE[resolved]
    : "border-border bg-panel-elevated text-muted-foreground";
  const label = resolved ? TIER_LABELS[resolved] : tier || "—";

  return (
    <span
      className={`inline-flex shrink-0 items-center border font-data font-medium tracking-[0.12em] uppercase ${frame} ${
        compact ? "h-6 px-1.5 text-[10px]" : "h-7 px-2 text-[11px]"
      }`}
    >
      {label}
    </span>
  );
}
