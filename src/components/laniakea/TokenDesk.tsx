"use client";

import { useActionState } from "react";
import {
  buyHp,
  cashOutHp,
  type WalletActionState,
} from "@/app/(dashboard)/wallet/actions";
import {
  BUY_HP_CAP,
  HP_PER_UTILITY_TOKEN,
  MASTERS_CASHOUT_RESERVE_HP,
  maxBuyHpTokens,
} from "@/lib/research/economy";

const initialState: WalletActionState = {};

const fieldClassName =
  "h-8 w-full border border-border bg-panel-elevated px-2.5 font-data text-[13px] text-foreground outline-none focus-visible:border-ring";

export function TokenDesk({
  mode,
  availableHp,
  availableTokens,
  schemaReady,
}: {
  mode: "buy" | "cashout";
  availableHp: number;
  availableTokens: number;
  schemaReady: boolean;
}) {
  const action = mode === "buy" ? buyHp : cashOutHp;
  const [state, formAction, pending] = useActionState(action, initialState);
  const maxCashout = Math.max(
    0,
    Math.floor((availableHp - MASTERS_CASHOUT_RESERVE_HP) / HP_PER_UTILITY_TOKEN) *
      HP_PER_UTILITY_TOKEN
  );
  const maxBuyTokens = Math.min(availableTokens, maxBuyHpTokens(availableHp));
  const blockedReason = !schemaReady
    ? "Token column is missing. Run the SQL above, then refresh."
    : mode === "buy" && maxBuyHpTokens(availableHp) < 1
      ? availableHp >= BUY_HP_CAP
        ? `Already at ${BUY_HP_CAP} HP. Bronze can only restore up to that cap.`
        : `Not enough room under ${BUY_HP_CAP} HP. Purchases are ${HP_PER_UTILITY_TOKEN} HP each.`
      : mode === "buy" && availableTokens < 1
        ? "Need at least 1 UTL."
        : mode === "cashout" && maxCashout < HP_PER_UTILITY_TOKEN
          ? `Need ${HP_PER_UTILITY_TOKEN + MASTERS_CASHOUT_RESERVE_HP} HP to cash out.`
          : null;

  return (
    <form
      key={state.stamp ?? "token-desk"}
      action={formAction}
      className="flex flex-col gap-2 p-2.5"
    >
      {mode === "buy" ? (
        <>
          <p className="text-[12px] text-muted-foreground">
            1 UTL buys {HP_PER_UTILITY_TOKEN} HP. Bronze only, and only to
            restore overall HP up to {BUY_HP_CAP}.
            {maxBuyTokens > 0
              ? ` Room for ${maxBuyTokens} UTL (${maxBuyTokens * HP_PER_UTILITY_TOKEN} HP).`
              : ""}
          </p>
          <label className="flex max-w-[12rem] flex-col gap-1">
            <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              UTL to spend
            </span>
            <input
              name="tokens"
              type="number"
              min={1}
              max={Math.max(maxBuyTokens, 1)}
              step={1}
              required
              defaultValue={1}
              className={fieldClassName}
            />
          </label>
        </>
      ) : (
        <>
          <p className="text-[12px] text-muted-foreground">
            {HP_PER_UTILITY_TOKEN} HP returns 1 UTL. Keep{" "}
            {MASTERS_CASHOUT_RESERVE_HP} HP in reserve.
          </p>
          <label className="flex max-w-[12rem] flex-col gap-1">
            <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              HP to convert
            </span>
            <input
              name="hp"
              type="number"
              min={HP_PER_UTILITY_TOKEN}
              max={Math.max(maxCashout, HP_PER_UTILITY_TOKEN)}
              step={HP_PER_UTILITY_TOKEN}
              required
              defaultValue={HP_PER_UTILITY_TOKEN}
              className={fieldClassName}
            />
          </label>
        </>
      )}
      {blockedReason ? (
        <p className="font-data text-[11px] text-warning">{blockedReason}</p>
      ) : null}
      {state.error ? (
        <p className="font-data text-[11px] text-loss">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="font-data text-[11px] text-gain">{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || Boolean(blockedReason)}
        className="h-8 w-fit border border-border bg-secondary px-3 text-[12px] font-medium tracking-wide text-foreground hover:bg-muted disabled:opacity-50"
      >
        {pending
          ? mode === "buy"
            ? "Buying…"
            : "Cashing out…"
          : mode === "buy"
            ? "Buy HP"
            : "Cash out"}
      </button>
    </form>
  );
}
