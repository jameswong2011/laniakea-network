"use client";

import { useActionState } from "react";
import { applyPassiveDrain, type AdminActionState } from "@/app/admin/actions";
import { PASSIVE_DRAIN_HP } from "@/lib/research/economy";

const initialState: AdminActionState = {};

export function PassiveDrainButton() {
  const [state, action, pending] = useActionState(
    applyPassiveDrain,
    initialState
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="h-7 border border-border bg-secondary px-2.5 font-data text-[10px] tracking-[0.12em] text-foreground uppercase hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Draining…" : "Apply Passive Drain"}
      </button>
      <p className="font-data text-[10px] text-muted-foreground">
        {PASSIVE_DRAIN_HP} HP from non-admin accounts
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
