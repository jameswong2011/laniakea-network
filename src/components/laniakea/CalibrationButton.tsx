"use client";

import { useActionState } from "react";
import {
  runCalibration,
  type CalibrationState,
} from "@/app/(dashboard)/ranking/actions";

const initialState: CalibrationState = {};

export function CalibrationButton() {
  const [state, action, pending] = useActionState(runCalibration, initialState);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="h-7 border border-border bg-secondary px-2.5 font-data text-[10px] tracking-[0.12em] text-foreground uppercase hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Calibrating…" : "Run Calibration"}
      </button>
      <p className="font-data text-[10px] text-muted-foreground">
        Weekly · top / bottom quartile
      </p>
      {state.error ? (
        <p className="font-data text-[10px] text-loss">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="font-data text-[10px] text-gain">{state.message}</p>
      ) : null}
    </form>
  );
}
