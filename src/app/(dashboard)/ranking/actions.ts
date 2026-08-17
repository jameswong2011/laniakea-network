"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import {
  applyCalibration,
  applySubtopicCalibration,
  planCalibration,
} from "@/lib/research/calibration";
import { getSubtopicRanks } from "@/lib/research/subtopic-ranks";
import { SUB_TOPICS, type Profile } from "@/types";

export type CalibrationState = {
  error?: string;
  message?: string;
  stamp?: number;
};

function refreshRanking() {
  revalidatePath("/ranking");
  revalidatePath("/feed");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function runCalibration(): Promise<CalibrationState> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, tier, current_hp");

  if (error) {
    return { error: error.message, stamp: Date.now() };
  }

  const profiles = (data ?? []) as Pick<
    Profile,
    "id" | "username" | "tier" | "current_hp"
  >[];
  const usernames = new Map(
    profiles.map((profile) => [profile.id, profile.username])
  );
  const overallMoves = planCalibration(profiles);

  if (overallMoves.length > 0) {
    const applied = await applyCalibration(supabase, overallMoves);

    if (applied.error) {
      return { error: applied.error, stamp: Date.now() };
    }
  }

  let topicPromoted = 0;
  let topicDemoted = 0;

  for (const subTopic of SUB_TOPICS) {
    const { ranks, error: rankError } = await getSubtopicRanks(
      supabase,
      subTopic
    );

    if (rankError) {
      return { error: rankError, stamp: Date.now() };
    }

    const topicMoves = planCalibration(
      ranks.map((rank) => ({
        id: rank.user_id,
        username: usernames.get(rank.user_id) ?? rank.user_id,
        tier: rank.tier,
        current_hp: rank.current_hp,
      }))
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
      return { error: applied.error, stamp: Date.now() };
    }

    topicPromoted += topicMoves.filter((move) => move.direction === "up").length;
    topicDemoted += topicMoves.filter((move) => move.direction === "down").length;
  }

  const promoted =
    overallMoves.filter((move) => move.direction === "up").length +
    topicPromoted;
  const demoted =
    overallMoves.filter((move) => move.direction === "down").length +
    topicDemoted;

  refreshRanking();

  if (promoted === 0 && demoted === 0) {
    return {
      message: "Calibration complete. No tier changes.",
      stamp: Date.now(),
    };
  }

  return {
    message: `Calibration complete. Promoted ${promoted}, demoted ${demoted}.`,
    stamp: Date.now(),
  };
}
