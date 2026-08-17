"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { applyCalibration, planCalibration } from "@/lib/research/calibration";
import type { Profile } from "@/types";

export type CalibrationState = {
  error?: string;
  message?: string;
  stamp?: number;
};

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
  const moves = planCalibration(profiles);

  if (moves.length === 0) {
    return {
      message: "Calibration complete. No tier changes.",
      stamp: Date.now(),
    };
  }

  const applied = await applyCalibration(supabase, moves);

  if (applied.error) {
    return { error: applied.error, stamp: Date.now() };
  }

  const promoted = moves.filter((move) => move.direction === "up").length;
  const demoted = moves.filter((move) => move.direction === "down").length;

  revalidatePath("/ranking");
  revalidatePath("/feed");
  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return {
    message: `Calibration complete. Promoted ${promoted}, demoted ${demoted}.`,
    stamp: Date.now(),
  };
}
