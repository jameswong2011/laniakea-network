"use client";

import { useActionState } from "react";
import {
  buyInviteCode,
  type InviteActionState,
} from "@/app/(dashboard)/invites/actions";
import { INVITE_PURCHASE_UTL } from "@/lib/research/referral";

const initialState: InviteActionState = {};

export function BuyInviteButton({ availableTokens }: { availableTokens: number }) {
  const [state, action, pending] = useActionState(buyInviteCode, initialState);
  const canBuy = availableTokens >= INVITE_PURCHASE_UTL;

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending || !canBuy}
        className="h-7 border border-border bg-secondary px-2.5 font-data text-[10px] tracking-[0.14em] text-foreground uppercase hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Buying…" : `Buy invite · ${INVITE_PURCHASE_UTL} UTL`}
      </button>
      {!canBuy ? (
        <p className="font-data text-[10px] text-warning">Need {INVITE_PURCHASE_UTL} UTL</p>
      ) : null}
      {state.error ? (
        <p className="font-data text-[11px] text-loss">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="font-data text-[11px] text-gain">{state.message}</p>
      ) : null}
    </form>
  );
}
