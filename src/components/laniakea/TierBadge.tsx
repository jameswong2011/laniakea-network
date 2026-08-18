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
  locked,
}: {
  tier: string;
  size?: "sm" | "md";
  /** When set, show 🔒 (hidden) or 🔓 (full / one tier above). */
  locked?: boolean;
}) {
  const resolved = resolveTier(tier);
  const compact = size === "sm";
  const frame = resolved
    ? TIER_TONE[resolved]
    : "border-border bg-panel-elevated text-muted-foreground";
  const label = resolved ? TIER_LABELS[resolved] : tier || "—";
  const lockMark =
    locked === undefined ? null : locked ? "🔒" : "🔓";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border ${frame} ${
        compact ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[12px]"
      }`}
      aria-label={
        lockMark
          ? `${label} desk, ${locked ? "locked" : "unlocked"}`
          : undefined
      }
    >
      {lockMark ? <span aria-hidden="true">{lockMark}</span> : null}
      {label}
    </span>
  );
}
