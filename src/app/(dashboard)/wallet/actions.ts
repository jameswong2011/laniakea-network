"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { canBuyHp, canCashOutHp } from "@/lib/research/access";
import {
  HP_PER_UTILITY_TOKEN,
  MASTERS_CASHOUT_RESERVE_HP,
} from "@/lib/research/economy";
import { applyWalletMove } from "@/lib/research/hp";
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
      error: "Buy HP is available below Masters.",
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

  refreshWallet();

  if (txError) {
    return {
      error: `HP credited, but ledger failed: ${txError.message}`,
      stamp: Date.now(),
    };
  }

  return {
    message: `Bought ${hp} HP for ${tokens} UTL.`,
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

  refreshWallet();

  if (txError) {
    return {
      error: `Tokens credited, but ledger failed: ${txError.message}`,
      stamp: Date.now(),
    };
  }

  return {
    message: `Cashed out ${hp} HP for ${tokens} UTL.`,
    stamp: Date.now(),
  };
}
