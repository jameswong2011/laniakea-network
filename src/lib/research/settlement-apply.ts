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

function payoutDescription(
  payout: SettlementPayout,
  subject: { kind: "post" | "comment"; id: string }
) {
  const noun = subject.kind === "comment" ? "comment" : "research post";

  if (payout.role === "ascent_author") {
    return `Ascent harvest (author) on ${noun} ${subject.id}`;
  }

  const multiple = formatMultiplier(payout.multiplier);

  if (payout.role === "ascent_up") {
    return multiple
      ? `Ascent harvest (${multiple}) on ${noun} ${subject.id}`
      : `Ascent harvest on ${noun} ${subject.id}`;
  }

  return multiple
    ? `Hunt bounty (${multiple}) on ${noun} ${subject.id}`
    : `Hunt bounty on ${noun} ${subject.id}`;
}

async function payPayouts(
  supabase: SupabaseClient,
  postId: string,
  payouts: SettlementPayout[],
  type: typeof HP_TRANSACTION_HUNT | typeof HP_TRANSACTION_ASCENT,
  subject: { kind: "post" | "comment"; id: string; commentId?: string }
) {
  for (const payout of payouts) {
    const credit = await creditProfileHp(supabase, payout.userId, payout.amount);

    if (!credit.ok) {
      return { error: credit.error };
    }

    const withComment = await supabase.from("hp_transactions").insert({
      user_id: payout.userId,
      amount: payout.amount,
      type,
      post_id: postId,
      comment_id: subject.commentId ?? null,
      description: payoutDescription(payout, subject),
    });
    const { error } =
      withComment.error && withComment.error.message.includes("comment_id")
        ? await supabase.from("hp_transactions").insert({
            user_id: payout.userId,
            amount: payout.amount,
            type,
            post_id: postId,
            description: payoutDescription(payout, subject),
          })
        : withComment;

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
    HP_TRANSACTION_HUNT,
    { kind: "post", id: postId }
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
    HP_TRANSACTION_ASCENT,
    { kind: "post", id: postId }
  );
}

export async function loadCommentSettlementVotes(
  supabase: SupabaseClient,
  commentId: string
): Promise<{ votes: SettlementVote[]; error: string | null }> {
  const { data, error } = await supabase
    .from("comment_votes")
    .select("user_id, value, health_at_vote")
    .eq("comment_id", commentId);

  if (error) {
    return { votes: [], error: error.message };
  }

  return {
    votes: ((data ?? []) as Array<{
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

export async function settleHuntedComment(
  supabase: SupabaseClient,
  commentId: string,
  postId: string,
  originalStake: number
) {
  const loaded = await loadCommentSettlementVotes(supabase, commentId);

  if (loaded.error) {
    return { error: loaded.error };
  }

  return payPayouts(
    supabase,
    postId,
    planHuntSettlement(originalStake, loaded.votes),
    HP_TRANSACTION_HUNT,
    { kind: "comment", id: commentId, commentId }
  );
}

export async function settleAscendedComment(
  supabase: SupabaseClient,
  commentId: string,
  postId: string,
  authorId: string,
  originalStake: number
) {
  const loaded = await loadCommentSettlementVotes(supabase, commentId);

  if (loaded.error) {
    return { error: loaded.error };
  }

  return payPayouts(
    supabase,
    postId,
    planAscentSettlement(authorId, originalStake, loaded.votes),
    HP_TRANSACTION_ASCENT,
    { kind: "comment", id: commentId, commentId }
  );
}
