import type { SupabaseClient } from "@supabase/supabase-js";
import {
  runFullCalibration,
  summarizeCalibration,
} from "@/lib/research/calibration";
import { runPassiveDrain } from "@/lib/research/drain";

export type WeeklyMaintenanceSource = "cron" | "manual";

export type WeeklyMaintenanceResult = {
  skipped: boolean;
  drained: number;
  drainSkipped: number;
  promoted: number;
  demoted: number;
  error: string | null;
  source: WeeklyMaintenanceSource;
};

export type WeeklyRunRow = {
  ran_at: string;
  source: string;
  drained: number;
  promoted: number;
  demoted: number;
  skipped: boolean;
};

function utcWeekStart(date = new Date()) {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = utc.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + mondayOffset);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

function asWeeklyResult(
  data: unknown,
  source: WeeklyMaintenanceSource
): WeeklyMaintenanceResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as Record<string, unknown>;

  if (typeof row.drained !== "number" && row.skipped !== true) {
    return null;
  }

  return {
    skipped: Boolean(row.skipped),
    drained: Number(row.drained ?? 0),
    drainSkipped: Number(row.drain_skipped ?? 0),
    promoted: Number(row.promoted ?? 0),
    demoted: Number(row.demoted ?? 0),
    error: typeof row.error === "string" ? row.error : null,
    source,
  };
}

async function alreadyRanThisWeek(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("weekly_maintenance_runs")
    .select("id")
    .eq("skipped", false)
    .gte("ran_at", utcWeekStart().toISOString())
    .limit(1)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data);
}

async function recordWeeklyRun(
  supabase: SupabaseClient,
  result: WeeklyMaintenanceResult
) {
  await supabase.from("weekly_maintenance_runs").insert({
    source: result.source,
    drained: result.drained,
    promoted: result.promoted,
    demoted: result.demoted,
    skipped: result.skipped,
    detail: {
      drain_skipped: result.drainSkipped,
      error: result.error,
    },
  });
}

export async function getLatestWeeklyRun(
  supabase: SupabaseClient
): Promise<{ run: WeeklyRunRow | null; missingTable: boolean }> {
  const { data, error } = await supabase
    .from("weekly_maintenance_runs")
    .select("ran_at, source, drained, promoted, demoted, skipped")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const missing =
      error.message.includes("schema cache") ||
      error.message.includes("does not exist") ||
      error.message.includes("Could not find");

    return { run: null, missingTable: missing };
  }

  return { run: (data as WeeklyRunRow | null) ?? null, missingTable: false };
}

export async function runWeeklyMaintenanceTs(
  supabase: SupabaseClient,
  source: WeeklyMaintenanceSource
): Promise<WeeklyMaintenanceResult> {
  if (source === "cron" && (await alreadyRanThisWeek(supabase))) {
    return {
      skipped: true,
      drained: 0,
      drainSkipped: 0,
      promoted: 0,
      demoted: 0,
      error: null,
      source,
    };
  }

  const drain = await runPassiveDrain(supabase);

  if (drain.error) {
    const failed: WeeklyMaintenanceResult = {
      skipped: false,
      drained: drain.drained,
      drainSkipped: drain.skipped,
      promoted: 0,
      demoted: 0,
      error: drain.error,
      source,
    };
    await recordWeeklyRun(supabase, failed);
    return failed;
  }

  const calibration = await runFullCalibration(supabase);

  if (calibration.error) {
    const failed: WeeklyMaintenanceResult = {
      skipped: false,
      drained: drain.drained,
      drainSkipped: drain.skipped,
      promoted: 0,
      demoted: 0,
      error: calibration.error,
      source,
    };
    await recordWeeklyRun(supabase, failed);
    return failed;
  }

  const { overallUp, overallDown, topicUp, topicDown } = summarizeCalibration(
    calibration.moves
  );
  const result: WeeklyMaintenanceResult = {
    skipped: false,
    drained: drain.drained,
    drainSkipped: drain.skipped,
    promoted: overallUp + topicUp,
    demoted: overallDown + topicDown,
    error: null,
    source,
  };

  await recordWeeklyRun(supabase, result);
  return result;
}

export async function invokeWeeklyMaintenance(
  supabase: SupabaseClient,
  source: WeeklyMaintenanceSource
): Promise<WeeklyMaintenanceResult> {
  const rpc = await supabase.rpc("run_weekly_maintenance", {
    p_source: source,
  });

  if (!rpc.error) {
    return (
      asWeeklyResult(rpc.data, source) ?? {
        skipped: false,
        drained: 0,
        drainSkipped: 0,
        promoted: 0,
        demoted: 0,
        error: null,
        source,
      }
    );
  }

  return runWeeklyMaintenanceTs(supabase, source);
}

export function weeklyMaintenanceMessage(result: WeeklyMaintenanceResult) {
  if (result.error) {
    return result.error;
  }

  if (result.skipped) {
    return "Weekly maintenance already ran this week.";
  }

  return `Weekly maintenance complete. Drain ${result.drained} desks. Calibration +${result.promoted} / −${result.demoted}.`;
}
