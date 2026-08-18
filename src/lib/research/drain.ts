import type { SupabaseClient } from "@supabase/supabase-js";
import { PASSIVE_DRAIN_HP } from "@/lib/research/economy";
import { TREASURY_PROFILE_ID } from "@/lib/research/referral";
import { debitProfileHp, restoreProfileHp } from "@/lib/research/hp";
import { HP_TRANSACTION_DRAIN } from "@/types";

export type DrainResult = {
  drained: number;
  skipped: number;
  error: string | null;
};

export async function runPassiveDrain(
  supabase: SupabaseClient
): Promise<DrainResult> {
  const withSystem = await supabase
    .from("profiles")
    .select("id, role, current_hp, is_system")
    .neq("role", "admin");

  const { data, error } =
    withSystem.error && withSystem.error.message.includes("is_system")
      ? await supabase
          .from("profiles")
          .select("id, role, current_hp")
          .neq("role", "admin")
      : withSystem;

  if (error) {
    return { drained: 0, skipped: 0, error: error.message };
  }

  let drained = 0;
  let skipped = 0;

  for (const profile of data ?? []) {
    if (
      profile.id === TREASURY_PROFILE_ID ||
      ("is_system" in profile && profile.is_system)
    ) {
      skipped += 1;
      continue;
    }

    if (profile.current_hp <= 0) {
      skipped += 1;
      continue;
    }

    const amount = Math.min(PASSIVE_DRAIN_HP, profile.current_hp);
    const debit = await debitProfileHp(supabase, profile.id, amount);

    if (!debit.ok) {
      skipped += 1;
      continue;
    }

    const { error: txError } = await supabase.from("hp_transactions").insert({
      user_id: profile.id,
      amount,
      type: HP_TRANSACTION_DRAIN,
      description: `Passive drain ${amount} HP`,
    });

    if (txError) {
      await restoreProfileHp(supabase, profile.id, debit.previousHp);
      return { drained, skipped, error: txError.message };
    }

    drained += 1;
  }

  return { drained, skipped, error: null };
}
