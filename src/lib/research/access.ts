import { TIER_LABELS, TIER_RANK, resolveTier, type Tier } from "@/types";

export type DeskAccess = "full" | "view_only" | "hidden";

export function nextTier(tier: Tier): Tier | null {
  const rank = TIER_RANK[tier];
  const found = (Object.entries(TIER_RANK) as [Tier, number][]).find(
    ([, value]) => value === rank + 1
  );

  return found?.[0] ?? null;
}

export function canBuyHp(tier: Tier) {
  return tier === "Bronze";
}

export function canCashOutHp(tier: Tier) {
  return tier === "Masters";
}

export function getDeskAccess(
  viewerTier: string | null | undefined,
  authorTier: string | null | undefined,
  isAdmin = false
): DeskAccess {
  if (isAdmin) {
    return "full";
  }

  const viewer = resolveTier(viewerTier);
  const author = resolveTier(authorTier);

  if (!author) {
    return "full";
  }

  const viewerRank = viewer ? TIER_RANK[viewer] : 1;
  const authorRank = TIER_RANK[author];

  if (authorRank <= viewerRank) {
    return "full";
  }

  if (authorRank === viewerRank + 1) {
    return "view_only";
  }

  return "hidden";
}

export function canOpenDesk(access: DeskAccess) {
  return access === "full" || access === "view_only";
}

export function canWriteDesk(access: DeskAccess) {
  return access === "full";
}

export function deskAccessLabel(access: DeskAccess, deskTier?: Tier | null) {
  const desk = deskTier ? ` · ${TIER_LABELS[deskTier]} desk` : "";

  if (access === "view_only") {
    return `View only${desk}`;
  }

  if (access === "hidden") {
    return `Locked${desk}`;
  }

  return null;
}
