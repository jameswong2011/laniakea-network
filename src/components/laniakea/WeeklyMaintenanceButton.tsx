"use client";

import { useActionState } from "react";
import {
  runWeeklyMaintenanceNow,
  type AdminActionState,
} from "@/app/admin/actions";
import { WEEKLY_CRON_LABEL } from "@/lib/research/economy";

const initialState: AdminActionState = {};

export function WeeklyMaintenanceButton() {
  const [state, action, pending] = useActionState(
    runWeeklyMaintenanceNow,
    initialState
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="h-7 border border-border bg-secondary px-2.5 font-data text-[10px] tracking-[0.12em] text-foreground uppercase hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Running…" : "Run Weekly Jobs Now"}
      </button>
      <p className="font-data text-[10px] text-muted-foreground">
        Auto {WEEKLY_CRON_LABEL}
      </p>
      {state.error ? (
        <p className="max-w-sm text-right font-data text-[10px] text-loss">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="max-w-sm text-right font-data text-[10px] text-gain">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
