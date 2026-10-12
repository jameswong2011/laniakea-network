import type { SupabaseClient } from "@supabase/supabase-js";
import { creditProfileHp } from "@/lib/research/hp";
import type { SettlementVote } from "@/lib/research/settlement";
import { isMissingCommentsSchema } from "@/lib/research/comments";
import { createServiceClient } from "@/lib/supabase/admin";
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

function isMissingSettleFn(message: string) {
  return (
    message.includes("42883") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

function settleSqlHint(error: string) {
  if (isMissingSettleFn(error)) {
    return `Bounty apply SQL is missing. Run supabase/migrations/20260822100000_settlement_apply.sql. ${error}`;
  }

  return error;
}

export async function settleHuntedPost(supabase: SupabaseClient, postId: string) {
  const rpc = await supabase.rpc("settle_hunted_post", { p_post_id: postId });
  return { error: rpc.error ? settleSqlHint(rpc.error.message) : null };
}

export async function settleAscendedPost(supabase: SupabaseClient, postId: string) {
  const rpc = await supabase.rpc("settle_ascended_post", { p_post_id: postId });
  return { error: rpc.error ? settleSqlHint(rpc.error.message) : null };
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
  postId: string
) {
  const rpc = await supabase.rpc("settle_hunted_comment", {
    p_comment_id: commentId,
    p_post_id: postId,
  });
  return { error: rpc.error ? settleSqlHint(rpc.error.message) : null };
}

export async function settleAscendedComment(
  supabase: SupabaseClient,
  commentId: string,
  postId: string
) {
  const rpc = await supabase.rpc("settle_ascended_comment", {
    p_comment_id: commentId,
    p_post_id: postId,
  });
  return { error: rpc.error ? settleSqlHint(rpc.error.message) : null };
}

type RefundRow = {
  userId: string;
  amount: number;
  postId: string;
  commentId: string;
  description: string;
};

async function refundRecorded(supabase: SupabaseClient, row: RefundRow) {
  const { count, error } = await (createServiceClient() ?? supabase)
    .from("hp_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", row.userId)
    .eq("post_id", row.postId)
    .eq("comment_id", row.commentId)
    .eq("type", HP_TRANSACTION_REFUND)
    .eq("description", row.description);

  return !error && (count ?? 0) > 0;
}

function refundLedgerError(message: string) {
  return message.includes("hp_transactions_type_check") || message.includes("refund")
    ? "Comment refunds need the refund ledger type. Run the comment-cascade SQL in Supabase."
    : message;
}

async function insertRefund(supabase: SupabaseClient, row: RefundRow) {
  if (await refundRecorded(supabase, row)) {
    return { error: null };
  }

  const withComment = await supabase.from("hp_transactions").insert({
    user_id: row.userId,
    amount: row.amount,
    type: HP_TRANSACTION_REFUND,
    post_id: row.postId,
    comment_id: row.commentId,
    description: row.description,
  });
  const ledger =
    withComment.error && withComment.error.message.includes("comment_id")
      ? await supabase.from("hp_transactions").insert({
          user_id: row.userId,
          amount: row.amount,
          type: HP_TRANSACTION_REFUND,
          post_id: row.postId,
          description: row.description,
        })
      : withComment;

  if (ledger.error) {
    return { error: refundLedgerError(ledger.error.message) };
  }

  const credit = await creditProfileHp(supabase, row.userId, row.amount);

  if (!credit.ok) {
    await supabase
      .from("hp_transactions")
      .delete()
      .eq("user_id", row.userId)
      .eq("post_id", row.postId)
      .eq("type", HP_TRANSACTION_REFUND)
      .eq("description", row.description);
    return { error: credit.error };
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
      const hunted = await settleHuntedComment(supabase, comment.id, postId);

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

async function postPayoutRecorded(postId: string, type: string) {
  const admin = createServiceClient();

  if (!admin) {
    return false;
  }

  const { count, error } = await admin
    .from("hp_transactions")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("type", type)
    .is("comment_id", null);

  return !error && (count ?? 0) > 0;
}

async function hasLiveComments(supabase: SupabaseClient, postId: string) {
  const { count, error } = await supabase
    .from("research_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("status", RESEARCH_POST_STATUS_LIVE);

  return Boolean(error) || (count ?? 0) > 0;
}

export async function resumeFrozenPostSettlement(
  supabase: SupabaseClient,
  post: {
    id: string;
    status: string;
  }
) {
  if (post.status === RESEARCH_POST_STATUS_ARCHIVED) {
    const [paid, liveComments] = await Promise.all([
      postPayoutRecorded(post.id, HP_TRANSACTION_HUNT),
      hasLiveComments(supabase, post.id),
    ]);

    if (!paid) {
      const hunted = await settleHuntedPost(supabase, post.id);

      if (hunted.error) {
        return hunted;
      }
    }

    return liveComments ? settleCommentsOnHuntedPost(supabase, post.id) : { error: null };
  }

  if (post.status === RESEARCH_POST_STATUS_ASCENDED) {
    const paid = await postPayoutRecorded(post.id, HP_TRANSACTION_ASCENT);
    return paid ? { error: null } : settleAscendedPost(supabase, post.id);
  }

  return { error: null };
}
