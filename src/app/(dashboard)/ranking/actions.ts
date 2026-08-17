"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { runFullCalibration, summarizeCalibration } from "@/lib/research/calibration";

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
  const { moves, error } = await runFullCalibration(supabase);

  if (error) {
    return { error, stamp: Date.now() };
  }

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
