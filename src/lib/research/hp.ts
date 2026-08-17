import type { SupabaseClient } from "@supabase/supabase-js";

type DebitResult =
  | { ok: true; previousHp: number; currentHp: number }
  | { ok: false; error: string };

type WalletMoveResult =
  | { ok: true; currentHp: number; utilityTokens: number }
  | { ok: false; error: string };

export async function debitProfileHp(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<DebitResult> {
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("current_hp")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!profile) {
    return { ok: false, error: "Profile was not found." };
  }

  if (profile.current_hp < amount) {
    return {
      ok: false,
      error: `Insufficient HP. Need ${amount}, have ${profile.current_hp}.`,
    };
  }

  const nextHp = profile.current_hp - amount;
  const { data: updated, error: writeError } = await supabase
    .from("profiles")
    .update({
      current_hp: nextHp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("current_hp", profile.current_hp)
    .select("current_hp")
    .maybeSingle();

  if (writeError) {
    return { ok: false, error: writeError.message };
  }

  if (!updated) {
    return { ok: false, error: "HP changed. Try again." };
  }

  return {
    ok: true,
    previousHp: profile.current_hp,
    currentHp: updated.current_hp,
  };
}

export async function restoreProfileHp(
  supabase: SupabaseClient,
  userId: string,
  previousHp: number
) {
  await supabase
    .from("profiles")
    .update({
      current_hp: previousHp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

export async function applyWalletMove(
  supabase: SupabaseClient,
  userId: string,
  move: { hpDelta: number; tokenDelta: number }
): Promise<WalletMoveResult> {
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("current_hp, utility_tokens")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!profile) {
    return { ok: false, error: "Profile was not found." };
  }

  const nextHp = profile.current_hp + move.hpDelta;
  const nextTokens = profile.utility_tokens + move.tokenDelta;

  if (nextHp < 0) {
    return { ok: false, error: "Insufficient HP." };
  }

  if (nextTokens < 0) {
    return { ok: false, error: "Insufficient UTL." };
  }

  const { data: updated, error: writeError } = await supabase
    .from("profiles")
    .update({
      current_hp: nextHp,
      utility_tokens: nextTokens,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("current_hp", profile.current_hp)
    .eq("utility_tokens", profile.utility_tokens)
    .select("current_hp, utility_tokens")
    .maybeSingle();

  if (writeError) {
    return { ok: false, error: writeError.message };
  }

  if (!updated) {
    return { ok: false, error: "Wallet changed. Try again." };
  }

  return {
    ok: true,
    currentHp: updated.current_hp,
    utilityTokens: updated.utility_tokens,
  };
}
