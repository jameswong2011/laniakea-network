"use client";

import { useActionState } from "react";
import { seedDemoDataset, type AdminActionState } from "@/app/admin/actions";

const initialState: AdminActionState = {};

export function SeedDemoDataButton() {
  const [state, action, pending] = useActionState(
    seedDemoDataset,
    initialState
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="h-7 border border-border bg-secondary px-2.5 font-data text-[10px] tracking-[0.12em] text-foreground uppercase hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Seeding…" : "Seed Demo Data"}
      </button>
      <p className="font-data text-[10px] text-muted-foreground">
        Safe to re-run
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