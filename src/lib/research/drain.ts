import type { SupabaseClient } from "@supabase/supabase-js";
import { PASSIVE_DRAIN_HP } from "@/lib/research/economy";
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
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, current_hp")
    .neq("role", "admin");

  if (error) {
    return { drained: 0, skipped: 0, error: error.message };
  }

  let drained = 0;
  let skipped = 0;

  for (const profile of data ?? []) {
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
