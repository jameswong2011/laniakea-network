import type { SupabaseClient } from "@supabase/supabase-js";
import { STARTING_HP } from "@/lib/research/economy";
import { TREASURY_PROFILE_ID } from "@/lib/research/referral";
import { getSubtopicRanks } from "@/lib/research/subtopic-ranks";
import {
  HP_TRANSACTION_CALIBRATION,
  SUB_TOPICS,
  resolveTier,
  TIERS,
  type Profile,
  type SubTopic,
  type Tier,
} from "@/types";

export const CALIBRATION_QUARTILE = 0.25;
export const CALIBRATION_BAND = CALIBRATION_QUARTILE;
/** Fresh stack after a promote or demote. HP does not travel between desks. */
export const CALIBRATION_RESET_HP = STARTING_HP;

export type CalibrationScope = "overall" | SubTopic;

export type CalibrationMove = {
  id: string;
  from: Tier;
  to: Tier;
  direction: "up" | "down";
  hp: number;
  scope: CalibrationScope;
};

export function adjacentTier(tier: Tier, delta: 1 | -1): Tier | null {
  const index = TIERS.indexOf(tier);

  if (index === -1) {
    return null;
  }

  const next = TIERS[index + delta];
  return next ?? null;
}

export function getQuartileSize(count: number) {
  if (count < 2) {
    return 0;
  }

  return Math.max(1, Math.floor(count * CALIBRATION_QUARTILE));
}

export function getCalibrationBandSize(count: number) {
  return getQuartileSize(count);
}

export type Calibratable = {
  id: string;
  username: string;
  tier: string;
  current_hp: number;
};

function sortByScore(rows: Calibratable[]) {
  return [...rows].sort((a, b) => {
    if (b.current_hp !== a.current_hp) {
      return b.current_hp - a.current_hp;
    }

    return a.username.localeCompare(b.username);
  });
}

function topQuartile(ranked: Calibratable[], size: number) {
  const edge = ranked[size - 1];

  if (!edge) {
    return [];
  }

  return ranked.filter((row) => row.current_hp >= edge.current_hp);
}

function bottomQuartile(ranked: Calibratable[], size: number) {
  const edge = ranked[ranked.length - size];

  if (!edge) {
    return [];
  }

  return ranked.filter((row) => row.current_hp <= edge.current_hp);
}

export function planCalibration(
  profiles: Calibratable[],
  scope: CalibrationScope = "overall"
): CalibrationMove[] {
  const ranked = sortByScore(profiles);
  const size = getQuartileSize(ranked.length);

  if (size === 0) {
    return [];
  }

  const promote = topQuartile(ranked, size);
  const demote = bottomQuartile(ranked, size);
  const promoteIds = new Set(promote.map((row) => row.id));
  const demoteIds = new Set(demote.map((row) => row.id));
  const contested = new Set(
    [...promoteIds].filter((id) => demoteIds.has(id))
  );
  const moves: CalibrationMove[] = [];

  for (const profile of promote) {
    if (contested.has(profile.id)) {
      continue;
    }

    const from = resolveTier(profile.tier);
    const to = from ? adjacentTier(from, 1) : null;

    if (from && to) {
      moves.push({
        id: profile.id,
        from,
        to,
        direction: "up",
        hp: profile.current_hp,
        scope,
      });
    }
  }

  for (const profile of demote) {
    if (contested.has(profile.id) || promoteIds.has(profile.id)) {
      continue;
    }

    const from = resolveTier(profile.tier);
    const to = from ? adjacentTier(from, -1) : null;

    if (from && to) {
      moves.push({
        id: profile.id,
        from,
        to,
        direction: "down",
        hp: profile.current_hp,
        scope,
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
        current_hp: CALIBRATION_RESET_HP,
        updated_at: now,
      })
      .eq("id", move.id);

    if (error) {
      return { error: error.message };
    }
  }

  return { error: null };
}

export async function applySubtopicCalibration(
  supabase: SupabaseClient,
  subTopic: SubTopic,
  moves: CalibrationMove[]
) {
  const now = new Date().toISOString();

  for (const move of moves) {
    const { error } = await supabase
      .from("subtopic_ranks")
      .update({
        tier: move.to,
        current_hp: CALIBRATION_RESET_HP,
        updated_at: now,
      })
      .eq("user_id", move.id)
      .eq("sub_topic", subTopic);

    if (error) {
      return { error: error.message };
    }
  }

  return { error: null };
}

export function calibrationLogDescription(move: CalibrationMove) {
  const verb = move.direction === "up" ? "promoted" : "demoted";
  const book = move.scope === "overall" ? "overall" : move.scope;

  return `Calibration ${book}: ${verb} ${move.from} → ${move.to} (reset ${move.hp} → ${CALIBRATION_RESET_HP} HP)`;
}

export async function recordCalibrationLogs(
  supabase: SupabaseClient,
  moves: CalibrationMove[]
) {
  if (moves.length === 0) {
    return { error: null };
  }

  const { error } = await supabase.from("hp_transactions").insert(
    moves.map((move) => ({
      user_id: move.id,
      amount: CALIBRATION_RESET_HP - move.hp,
      type: HP_TRANSACTION_CALIBRATION,
      description: calibrationLogDescription(move),
    }))
  );

  return { error: error?.message ?? null };
}

export function summarizeCalibration(moves: CalibrationMove[]) {
  const overallUp = moves.filter(
    (move) => move.scope === "overall" && move.direction === "up"
  ).length;
  const overallDown = moves.filter(
    (move) => move.scope === "overall" && move.direction === "down"
  ).length;
  const topicUp = moves.filter(
    (move) => move.scope !== "overall" && move.direction === "up"
  ).length;
  const topicDown = moves.filter(
    (move) => move.scope !== "overall" && move.direction === "down"
  ).length;

  return { overallUp, overallDown, topicUp, topicDown };
}

export async function runFullCalibration(supabase: SupabaseClient) {
  const withSystem = await supabase
    .from("profiles")
    .select("id, username, tier, current_hp, is_system")
    .neq("id", TREASURY_PROFILE_ID);

  const { data, error } =
    withSystem.error && withSystem.error.message.includes("is_system")
      ? await supabase
          .from("profiles")
          .select("id, username, tier, current_hp")
          .neq("id", TREASURY_PROFILE_ID)
      : withSystem;

  if (error) {
    return { moves: [] as CalibrationMove[], error: error.message };
  }

  const profiles = ((data ?? []) as Array<
    Pick<Profile, "id" | "username" | "tier" | "current_hp"> & {
      is_system?: boolean | null;
    }
  >).filter(
    (profile) => profile.id !== TREASURY_PROFILE_ID && !profile.is_system
  );
  const usernames = new Map(
    profiles.map((profile) => [profile.id, profile.username])
  );
  const moves: CalibrationMove[] = planCalibration(profiles, "overall");

  if (moves.length > 0) {
    const applied = await applyCalibration(supabase, moves);

    if (applied.error) {
      return { moves, error: applied.error };
    }
  }

  for (const subTopic of SUB_TOPICS) {
    const { ranks, error: rankError } = await getSubtopicRanks(
      supabase,
      subTopic
    );

    if (rankError) {
      return { moves, error: rankError };
    }

    const topicMoves = planCalibration(
      ranks.map((rank) => ({
        id: rank.user_id,
        username: usernames.get(rank.user_id) ?? rank.user_id,
        tier: rank.tier,
        current_hp: rank.current_hp,
      })),
      subTopic
    );

    if (topicMoves.length === 0) {
      continue;
    }

    const applied = await applySubtopicCalibration(
      supabase,
      subTopic,
      topicMoves
    );

    if (applied.error) {
      return { moves, error: applied.error };
    }

    moves.push(...topicMoves);
  }

  await recordCalibrationLogs(supabase, moves);

  return { moves, error: null };
}
