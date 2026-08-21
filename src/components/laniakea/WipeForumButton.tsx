"use client";

import { useActionState } from "react";
import { wipeForumContent, type AdminActionState } from "@/app/admin/actions";

const initialState: AdminActionState = {};

export function WipeForumButton() {
  const [state, action, pending] = useActionState(wipeForumContent, initialState);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input
        name="confirm"
        placeholder="Type WIPE"
        autoComplete="off"
        className="h-8 w-28 border border-border bg-bg px-2 font-data text-[11px] text-foreground"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-8 border border-loss/40 bg-loss/10 px-3 font-data text-[10px] tracking-[0.12em] text-foreground uppercase hover:bg-loss/20 disabled:opacity-50"
      >
        {pending ? "Wiping…" : "Wipe tape"}
      </button>
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