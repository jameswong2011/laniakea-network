"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  unlockHigherDeskPost,
  type UnlockActionState,
} from "@/app/(dashboard)/feed/unlock-actions";
import type { DeskAccess } from "@/lib/research/access";
import { unlockCtaLabel } from "@/lib/research/unlock";
import type { UnlockQuote } from "@/types";

const initialState: UnlockActionState = {};

export function UnlockPostButton({
  postId,
  access,
  quote,
  availableTokens,
  layout = "compact",
}: {
  postId: string;
  access: DeskAccess;
  quote: UnlockQuote;
  availableTokens: number;
  layout?: "compact" | "block";
}) {
  const [state, action, pending] = useActionState(
    unlockHigherDeskPost,
    initialState
  );
  const label = unlockCtaLabel(access);
  const canPay = availableTokens >= quote.tokens;

  return (
    <form
      key={state.stamp ?? `unlock-${postId}`}
      action={action}
      className={layout === "block" ? "flex flex-col gap-2" : "flex flex-col gap-1"}
    >
      <input type="hidden" name="postId" value={postId} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending || !canPay}
          className="h-7 w-fit border border-border bg-secondary px-2.5 font-data text-[10px] tracking-[0.14em] text-foreground uppercase hover:bg-muted disabled:opacity-50"
        >
          {pending
            ? "Unlocking…"
            : `${label ?? "Unlock"} · ${quote.tokens} UTL`}
        </button>
        {!canPay ? (
          <Link
            href="/wallet"
            className="font-data text-[10px] tracking-[0.12em] text-warning uppercase hover:text-foreground"
          >
            Need {quote.tokens} UTL
          </Link>
        ) : null}
      </div>
      {state.error ? (
        <p className="font-data text-[11px] text-loss">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="font-data text-[11px] text-gain">{state.message}</p>
      ) : null}
    </form>
  );
}
