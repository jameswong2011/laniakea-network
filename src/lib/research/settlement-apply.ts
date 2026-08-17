import type { SupabaseClient } from "@supabase/supabase-js";
import { creditProfileHp } from "@/lib/research/hp";
import {
  planAscentSettlement,
  planHuntSettlement,
  type SettlementPayout,
  type SettlementVote,
} from "@/lib/research/settlement";
import { HP_TRANSACTION_ASCENT, HP_TRANSACTION_HUNT } from "@/types";

function formatMultiplier(multiplier: number | null) {
  if (multiplier == null) {
    return null;
  }

  return `${multiplier.toFixed(2)}x`;
}

function payoutDescription(payout: SettlementPayout, postId: string) {
  if (payout.role === "ascent_author") {
    return `Ascent harvest (author) on research post ${postId}`;
  }

  const multiple = formatMultiplier(payout.multiplier);

  if (payout.role === "ascent_up") {
    return multiple
      ? `Ascent harvest (${multiple}) on research post ${postId}`
      : `Ascent harvest on research post ${postId}`;
  }

  return multiple
    ? `Hunt bounty (${multiple}) on research post ${postId}`
    : `Hunt bounty on research post ${postId}`;
}

async function payPayouts(
  supabase: SupabaseClient,
  postId: string,
  payouts: SettlementPayout[],
  type: typeof HP_TRANSACTION_HUNT | typeof HP_TRANSACTION_ASCENT
) {
  for (const payout of payouts) {
    const credit = await creditProfileHp(supabase, payout.userId, payout.amount);

    if (!credit.ok) {
      return { error: credit.error };
    }

    const { error } = await supabase.from("hp_transactions").insert({
      user_id: payout.userId,
      amount: payout.amount,
      type,
      post_id: postId,
      description: payoutDescription(payout, postId),
    });

    if (error) {
      return { error: error.message };
    }
  }

  return { error: null };
}

export async function loadSettlementVotes(
  supabase: SupabaseClient,
  postId: string
): Promise<{ votes: SettlementVote[]; error: string | null }> {
  const withHealth = await supabase
    .from("votes")
    .select("user_id, value, health_at_vote")
    .eq("post_id", postId);

  const rows =
    withHealth.error && withHealth.error.message.includes("health_at_vote")
      ? await supabase
          .from("votes")
          .select("user_id, value")
          .eq("post_id", postId)
      : withHealth;

  if (rows.error) {
    return { votes: [], error: rows.error.message };
  }

  return {
    votes: ((rows.data ?? []) as Array<{
      user_id: string;
      value: number;
      health_at_vote?: number | null;
    }>).map((row) => ({
      userId: row.user_id,
      value: row.value,
      healthAtVote: row.health_at_vote ?? 0,
    })),
    error: null,
  };
}

export async function settleHuntedPost(
  supabase: SupabaseClient,
  postId: string,
  originalStake: number
) {
  const loaded = await loadSettlementVotes(supabase, postId);

  if (loaded.error) {
    return { error: loaded.error };
  }

  return payPayouts(
    supabase,
    postId,
    planHuntSettlement(originalStake, loaded.votes),
    HP_TRANSACTION_HUNT
  );
}

export async function settleAscendedPost(
  supabase: SupabaseClient,
  postId: string,
  authorId: string,
  originalStake: number
) {
  const loaded = await loadSettlementVotes(supabase, postId);

  if (loaded.error) {
    return { error: loaded.error };
  }

  return payPayouts(
    supabase,
    postId,
    planAscentSettlement(authorId, originalStake, loaded.votes),
    HP_TRANSACTION_ASCENT
  );
}
