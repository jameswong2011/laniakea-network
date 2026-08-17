"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import {
  applyCalibration,
  applySubtopicCalibration,
  planCalibration,
  recordCalibrationLogs,
  summarizeCalibration,
  type CalibrationMove,
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
  revalidatePath("/wallet");
}

export async function runCalibration(
  _prevState: CalibrationState,
  _formData: FormData
): Promise<CalibrationState> {
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
  const moves: CalibrationMove[] = planCalibration(profiles, "overall");

  if (moves.length > 0) {
    const applied = await applyCalibration(supabase, moves);

    if (applied.error) {
      return { error: applied.error, stamp: Date.now() };
    }
  }

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
      return { error: applied.error, stamp: Date.now() };
    }

    moves.push(...topicMoves);
  }

  await recordCalibrationLogs(supabase, moves);

  const { overallUp, overallDown, topicUp, topicDown } =
    summarizeCalibration(moves);

  refreshRanking();

  if (moves.length === 0) {
    return {
      message: "Calibration complete. No quartile moves.",
      stamp: Date.now(),
    };
  }

  return {
    message: `Calibration complete. Overall +${overallUp} / −${overallDown}. Topics +${topicUp} / −${topicDown}.`,
    stamp: Date.now(),
  };
}
