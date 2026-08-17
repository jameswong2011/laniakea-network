import type { SupabaseClient } from "@supabase/supabase-js";
import { creditProfileHp } from "@/lib/research/hp";
import {
  planAscentSettlement,
  planHuntSettlement,
  type SettlementPayout,
  type SettlementVote,
} from "@/lib/research/settlement";
import { isMissingCommentsSchema } from "@/lib/research/comments";
import {
  HP_TRANSACTION_ASCENT,
  HP_TRANSACTION_HUNT,
  HP_TRANSACTION_REFUND,
  RESEARCH_POST_STATUS_ARCHIVED,
  RESEARCH_POST_STATUS_ASCENDED,
  RESEARCH_POST_STATUS_LIVE,
  RESEARCH_POST_STATUS_REFUNDED,
  voteStrength,
} from "@/types";

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

async function insertRefund(
  supabase: SupabaseClient,
  row: {
    userId: string;
    amount: number;
    postId: string;
    commentId: string;
    description: string;
  }
) {
  const credit = await creditProfileHp(supabase, row.userId, row.amount);

  if (!credit.ok) {
    return { error: credit.error };
  }

  const withComment = await supabase.from("hp_transactions").insert({
    user_id: row.userId,
    amount: row.amount,
    type: HP_TRANSACTION_REFUND,
    post_id: row.postId,
    comment_id: row.commentId,
    description: row.description,
  });
  const { error } =
    withComment.error && withComment.error.message.includes("comment_id")
      ? await supabase.from("hp_transactions").insert({
          user_id: row.userId,
          amount: row.amount,
          type: HP_TRANSACTION_REFUND,
          post_id: row.postId,
          description: row.description,
        })
      : withComment;

  if (error) {
    return {
      error:
        error.message.includes("hp_transactions_type_check") ||
        error.message.includes("refund")
          ? "Comment refunds need the refund ledger type. Run the comment-cascade SQL in Supabase."
          : error.message,
    };
  }

  return { error: null };
}

async function refundCommentMarket(
  supabase: SupabaseClient,
  comment: {
    id: string;
    authorId: string;
    originalStake: number;
  },
  postId: string
) {
  const loaded = await loadCommentSettlementVotes(supabase, comment.id);

  if (loaded.error) {
    return { error: loaded.error };
  }

  for (const vote of loaded.votes) {
    const amount = voteStrength(vote.value);

    if (amount <= 0) {
      continue;
    }

    const paid = await insertRefund(supabase, {
      userId: vote.userId,
      amount,
      postId,
      commentId: comment.id,
      description: `Vote refund on comment ${comment.id} (parent hunted)`,
    });

    if (paid.error) {
      return paid;
    }
  }

  if (comment.originalStake > 0) {
    const stakeBack = await insertRefund(supabase, {
      userId: comment.authorId,
      amount: comment.originalStake,
      postId,
      commentId: comment.id,
      description: `Stake refund on comment ${comment.id} (parent hunted)`,
    });

    if (stakeBack.error) {
      return stakeBack;
    }
  }

  return { error: null };
}

async function freezeComment(
  supabase: SupabaseClient,
  commentId: string,
  status: string,
  currentHealth?: number
) {
  const patch: {
    status: string;
    updated_at: string;
    current_health?: number;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (currentHealth != null) {
    patch.current_health = currentHealth;
  }

  const { error } = await supabase
    .from("research_comments")
    .update(patch)
    .eq("id", commentId);

  if (error) {
    return {
      error:
        error.message.includes("status") || error.message.includes("refunded")
          ? "Comment refunds need the refunded status. Run the comment-cascade SQL in Supabase."
          : error.message,
    };
  }

  return { error: null };
}

/**
 * When a parent note is hunted:
 * - live comments below their own original stake hunt-settle
 * - live comments at/above their own original stake, and not ascended,
 *   refund vote HP and the author's original stake
 * Already hunted or ascended comments are left alone.
 */
export async function settleCommentsOnHuntedPost(
  supabase: SupabaseClient,
  postId: string
) {
  const { data, error } = await supabase
    .from("research_comments")
    .select("id, author_id, current_health, original_stake, status")
    .eq("post_id", postId);

  if (error) {
    if (isMissingCommentsSchema(error.message)) {
      return { error: null };
    }

    return { error: error.message };
  }

  for (const comment of (data ?? []) as Array<{
    id: string;
    author_id: string;
    current_health: number;
    original_stake: number;
    status: string;
  }>) {
    if (
      comment.status === RESEARCH_POST_STATUS_ASCENDED ||
      comment.status === RESEARCH_POST_STATUS_ARCHIVED ||
      comment.status === RESEARCH_POST_STATUS_REFUNDED
    ) {
      continue;
    }

    if (comment.status !== RESEARCH_POST_STATUS_LIVE) {
      continue;
    }

    if (comment.current_health < comment.original_stake) {
      const hunted = await settleHuntedComment(
        supabase,
        comment.id,
        postId,
        comment.original_stake
      );

      if (hunted.error) {
        return hunted;
      }

      const frozen = await freezeComment(
        supabase,
        comment.id,
        RESEARCH_POST_STATUS_ARCHIVED,
        0
      );

      if (frozen.error) {
        return frozen;
      }

      continue;
    }

    const refunded = await refundCommentMarket(
      supabase,
      {
        id: comment.id,
        authorId: comment.author_id,
        originalStake: comment.original_stake,
      },
      postId
    );

    if (refunded.error) {
      return refunded;
    }

    const frozen = await freezeComment(
      supabase,
      comment.id,
      RESEARCH_POST_STATUS_REFUNDED
    );

    if (frozen.error) {
      return frozen;
    }
  }

  return { error: null };
}
