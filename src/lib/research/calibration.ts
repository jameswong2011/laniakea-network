import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveTier, TIERS, type Profile, type Tier } from "@/types";

export const CALIBRATION_BAND = 0.2;

export type CalibrationMove = {
  id: string;
  from: Tier;
  to: Tier;
  direction: "up" | "down";
};

export function adjacentTier(tier: Tier, delta: 1 | -1): Tier | null {
  const index = TIERS.indexOf(tier);

  if (index === -1) {
    return null;
  }

  const next = TIERS[index + delta];
  return next ?? null;
}

export function getCalibrationBandSize(count: number) {
  if (count < 2) {
    return 0;
  }

  return Math.max(1, Math.floor(count * CALIBRATION_BAND));
}

export function planCalibration(
  profiles: Pick<Profile, "id" | "username" | "tier" | "current_hp">[]
): CalibrationMove[] {
  const ranked = [...profiles].sort((a, b) => {
    if (b.current_hp !== a.current_hp) {
      return b.current_hp - a.current_hp;
    }

    return a.username.localeCompare(b.username);
  });

  const band = getCalibrationBandSize(ranked.length);

  if (band === 0) {
    return [];
  }

  const promote = ranked.slice(0, band);
  const demote = ranked.slice(-band);
  const promotedIds = new Set(promote.map((profile) => profile.id));
  const moves: CalibrationMove[] = [];

  for (const profile of promote) {
    const from = resolveTier(profile.tier);

    if (!from) {
      continue;
    }

    const to = adjacentTier(from, 1);

    if (to) {
      moves.push({
        id: profile.id,
        from,
        to,
        direction: "up",
      });
    }
  }

  for (const profile of demote) {
    if (promotedIds.has(profile.id)) {
      continue;
    }

    const from = resolveTier(profile.tier);

    if (!from) {
      continue;
    }

    const to = adjacentTier(from, -1);

    if (to) {
      moves.push({
        id: profile.id,
        from,
        to,
        direction: "down",
      });
    }
  }

  return moves;
}

export async function applyCalibration(
  supabase: SupabaseClient,
  moves: CalibrationMove[]
) {
  const now = new Date().toISOString();

  for (const move of moves) {
    const { error } = await supabase
      .from("profiles")
      .update({
        tier: move.to,
        updated_at: now,
      })
      .eq("id", move.id);

    if (error) {
      return { error: error.message };
    }
  }

  return { error: null };
}
