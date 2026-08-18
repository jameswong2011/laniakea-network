"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { canBuyHp, canCashOutHp } from "@/lib/research/access";
import {
  BUY_HP_CAP,
  HP_PER_UTILITY_TOKEN,
  MASTERS_CASHOUT_RESERVE_HP,
  maxBuyHpTokens,
} from "@/lib/research/economy";
import { applyWalletMove } from "@/lib/research/hp";
import { isMissingInviteSchema } from "@/lib/research/invite";
import { isMissingUtilityTokenColumn, missingUtilityTokenMessage } from "@/lib/research/tokens";
import { HP_TRANSACTION_BUY, HP_TRANSACTION_CASHOUT, resolveTier } from "@/types";

export type WalletActionState = {
  error?: string;
  message?: string;
  stamp?: number;
};

const buySchema = z.object({
  tokens: z.coerce
    .number()
    .int("UTL must be a whole number.")
    .min(1, "Spend at least 1 UTL."),
});

const cashoutSchema = z.object({
  hp: z.coerce
    .number()
    .int("HP must be a whole number.")
    .min(HP_PER_UTILITY_TOKEN, `Cash out at least ${HP_PER_UTILITY_TOKEN} HP.`),
});

function refreshWallet() {
  revalidatePath("/wallet");
  revalidatePath("/dashboard");
  revalidatePath("/feed");
  revalidatePath("/ranking");
}

export async function buyHp(
  _prevState: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  const { supabase, userId, profile } = await requireUser();
  const tier = resolveTier(profile?.tier);

  if (!tier || !canBuyHp(tier)) {
    return {
      error: "Buy HP is available to Bronze only.",
      stamp: Date.now(),
    };
  }

  const parsed = buySchema.safeParse({ tokens: formData.get("tokens") });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid buy order.",
      stamp: Date.now(),
    };
  }

  const tokens = parsed.data.tokens;
  const hp = tokens * HP_PER_UTILITY_TOKEN;
  const room = maxBuyHpTokens(profile?.current_hp ?? 0);

  if (room < 1) {
    return {
      error:
        (profile?.current_hp ?? 0) >= BUY_HP_CAP
          ? `Already at ${BUY_HP_CAP} HP. Bronze can only restore up to that cap.`
          : `Not enough room under ${BUY_HP_CAP} HP. Purchases are ${HP_PER_UTILITY_TOKEN} HP each.`,
      stamp: Date.now(),
    };
  }

  if (tokens > room) {
    return {
      error: `Bronze can restore up to ${BUY_HP_CAP} HP. Room for ${room} UTL (${room * HP_PER_UTILITY_TOKEN} HP).`,
      stamp: Date.now(),
    };
  }
  const referred = await supabase.rpc("buy_hp_with_referral", {
    p_tokens: tokens,
  });

  if (!referred.error) {
    const receipt =
      referred.data && typeof referred.data === "object"
        ? (referred.data as { currentHp?: number; utilityTokens?: number })
        : null;
    refreshWallet();
    return {
      message: `Bought ${hp} HP for ${tokens} UTL. Balance ${receipt?.currentHp ?? "—"} HP / ${receipt?.utilityTokens ?? "—"} UTL.`,
      stamp: Date.now(),
    };
  }

  if (!isMissingInviteSchema(referred.error.message)
    && !referred.error.message.includes("buy_hp_with_referral")) {
    return {
      error: referred.error.message
        .replace(/^ERROR:\s*/i, "")
        .replace(/\s+CONTEXT:[\s\S]*$/, ""),
      stamp: Date.now(),
    };
  }

  const move = await applyWalletMove(supabase, userId, {
    hpDelta: hp,
    tokenDelta: -tokens,
  });

  if (!move.ok) {
    return { error: move.error, stamp: Date.now() };
  }

  const { error: txError } = await supabase.from("hp_transactions").insert({
    user_id: userId,
    amount: hp,
    type: HP_TRANSACTION_BUY,
    description: `Bought ${hp} HP with ${tokens} UTL`,
  });

  if (txError) {
    await applyWalletMove(supabase, userId, {
      hpDelta: -hp,
      tokenDelta: tokens,
    });
    refreshWallet();
    return {
      error: ledgerError(txError.message),
      stamp: Date.now(),
    };
  }

  refreshWallet();
  return {
    message: `Bought ${hp} HP for ${tokens} UTL. Balance ${move.currentHp} HP / ${move.utilityTokens} UTL.`,
    stamp: Date.now(),
  };
}

export async function cashOutHp(
  _prevState: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  const { supabase, userId, profile } = await requireUser();
  const tier = resolveTier(profile?.tier);

  if (!tier || !canCashOutHp(tier)) {
    return {
      error: "Cash out is available to Masters only.",
      stamp: Date.now(),
    };
  }

  const parsed = cashoutSchema.safeParse({ hp: formData.get("hp") });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid cash-out order.",
      stamp: Date.now(),
    };
  }

  const hp = parsed.data.hp;

  if (hp % HP_PER_UTILITY_TOKEN !== 0) {
    return {
      error: `Cash out HP in multiples of ${HP_PER_UTILITY_TOKEN}.`,
      stamp: Date.now(),
    };
  }

  const remaining = (profile?.current_hp ?? 0) - hp;

  if (remaining < MASTERS_CASHOUT_RESERVE_HP) {
    return {
      error: `Keep at least ${MASTERS_CASHOUT_RESERVE_HP} HP in reserve.`,
      stamp: Date.now(),
    };
  }

  const tokens = hp / HP_PER_UTILITY_TOKEN;
  const move = await applyWalletMove(supabase, userId, {
    hpDelta: -hp,
    tokenDelta: tokens,
  });

  if (!move.ok) {
    return { error: move.error, stamp: Date.now() };
  }

  const { error: txError } = await supabase.from("hp_transactions").insert({
    user_id: userId,
    amount: hp,
    type: HP_TRANSACTION_CASHOUT,
    description: `Cashed out ${hp} HP for ${tokens} UTL`,
  });

  if (txError) {
    await applyWalletMove(supabase, userId, {
      hpDelta: hp,
      tokenDelta: -tokens,
    });
    refreshWallet();
    return {
      error: ledgerError(txError.message),
      stamp: Date.now(),
    };
  }

  refreshWallet();
  return {
    message: `Cashed out ${hp} HP for ${tokens} UTL. Balance ${move.currentHp} HP / ${move.utilityTokens} UTL.`,
    stamp: Date.now(),
  };
}

function ledgerError(message: string) {
  if (isMissingUtilityTokenColumn(message)) {
    return missingUtilityTokenMessage();
  }

  if (
    message.includes("hp_transactions_type_check") ||
    message.includes("violates check constraint")
  ) {
    return `Ledger rejected type buy/cashout. Run the Wallet SQL to widen hp_transactions.type. ${message}`;
  }

  return `Wallet move was reversed because the ledger write failed: ${message}`;
}
