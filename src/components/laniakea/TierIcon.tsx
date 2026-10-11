import type { Tier } from "@/types";

function barsFor(tier: Tier) {
  if (tier === "Bronze") return 1;
  if (tier === "Silver") return 2;
  if (tier === "Gold") return 3;
  return 4;
}

export function TierIcon({ tier, size = 12 }: { tier: Tier; size?: number }) {
  if (tier === "Masters") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 0.8 9.9 5.6l5.2.4-4 3.3 1.3 5L8 11.5 3.6 14.3l1.3-5-4-3.3 5.2-.4Z"
        />
      </svg>
    );
  }

  const bars = barsFor(tier);
  const height = bars === 4 ? 1.6 : 2;
  const gap = bars === 4 ? 1.4 : 2.2;
  const total = bars * height + (bars - 1) * gap;
  const start = (16 - total) / 2;

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {Array.from({ length: bars }, (_, index) => (
        <rect
          key={index}
          x="1"
          y={start + index * (height + gap)}
          width="14"
          height={height}
          rx="0.8"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
