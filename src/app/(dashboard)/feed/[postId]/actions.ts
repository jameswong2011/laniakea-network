"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getDeskAccess } from "@/lib/research/access";
import {
  DEFAULT_COMMENT_STAKE_HP,
  MAX_STAKE_HP,
  ascentLine,
  voteCostHp,
  voteHealthDelta,
} from "@/lib/research/economy";
import { researchPostPath } from "@/lib/research/feed";
import { debitProfileHp, restoreProfileHp } from "@/lib/research/hp";
import {
  settleAscendedComment,
  settleHuntedComment,
} from "@/lib/research/settlement-apply";
import { recordSubtopicParticipation } from "@/lib/research/subtopic-ranks";
import {
  COMMENT_BODY_MAX,
  HP_TRANSACTION_STAKE,
  HP_TRANSACTION_VOTE,
  RESEARCH_POST_STATUS_ARCHIVED,
  RESEARCH_POST_STATUS_ASCENDED,
  RESEARCH_POST_STATUS_LIVE,
  REPLY_BODY_MAX,
  VOTE_STRENGTH_MAX,
  VOTE_STRENGTH_MIN,
  resolveSubTopic,
  signedVoteValue,
  voteStrength,
  type VoteDirection,
} from "@/types";

export type ThreadActionState = {
  error?: string;
  message?: string;
  stamp?: number;
};

const commentSchema = z.object({
  postId: z.string().uuid("Invalid post."),
  body: z.string().trim().min(1, "Comment is required.").max(COMMENT_BODY_MAX),
  stakeHp: z.coerce
    .number()
    .int("Stake must be a whole number.")
    .min(1, "Stake at least 1 HP.")
    .max(MAX_STAKE_HP, `Stake at most ${MAX_STAKE_HP} HP.`),
});

const commentVoteSchema = z.object({
  postId: z.string().uuid("Invalid post."),
  commentId: z.string().uuid("Invalid comment."),
  direction: z
    .string()
    .trim()
    .refine((value): value is VoteDirection => {
      return value === "up" || value === "down";
    }, "Choose up or down."),
  strength: z.coerce
    .number()
    .int("Conviction must be a whole number.")
    .min(VOTE_STRENGTH_MIN, `Conviction at least ${VOTE_STRENGTH_MIN}.`)
    .max(VOTE_STRENGTH_MAX, `Conviction at most ${VOTE_STRENGTH_MAX}.`),
});

const replySchema = z.object({
  postId: z.string().uuid("Invalid post."),
  commentId: z.string().uuid("Invalid comment."),
  body: z.string().trim().min(1, "Reply is required.").max(REPLY_BODY_MAX),
});

const likeSchema = z.object({
  postId: z.string().uuid("Invalid post."),
  replyId: z.string().uuid("Invalid reply."),
});

function refreshThread(postId: string) {
  revalidatePath(researchPostPath(postId));
  revalidatePath("/feed");
  revalidatePath("/dashboard");
  revalidatePath("/wallet");
}

async function insertLedger(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  row: {
    user_id: string;
    amount: number;
    type: string;
    post_id: string;
    comment_id?: string;
    description: string;
  }
) {
  const withComment = await supabase.from("hp_transactions").insert(row);

  if (withComment.error && withComment.error.message.includes("comment_id")) {
    const { comment_id: _commentId, ...withoutComment } = row;
    return supabase.from("hp_transactions").insert(withoutComment);
  }

  return withComment;
}

async function loadVisiblePost(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  postId: string,
  viewer: { tier?: string | null; role?: string | null }
) {
  const { data: post, error } = await supabase
    .from("research_posts")
    .select("id, author_id, status, sub_topic")
    .eq("id", postId)
    .maybeSingle();

  if (error || !post) {
    return { post: null, access: null, error: "Post was not found." };
  }

  const { data: author } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", post.author_id)
    .maybeSingle();

  const access = getDeskAccess(
    viewer.tier,
    author?.tier,
    viewer.role === "admin"
  );

  if (access === "hidden") {
    return { post: null, access: null, error: "Post was not found." };
  }

  return { post, access, error: null };
}

export async function createComment(
  _prevState: ThreadActionState,
  formData: FormData
): Promise<ThreadActionState> {
  const { supabase, userId, profile } = await requireUser();
  const parsed = commentSchema.safeParse({
    postId: formData.get("postId"),
    body: formData.get("body"),
    stakeHp: formData.get("stakeHp") ?? DEFAULT_COMMENT_STAKE_HP,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid comment.",
      stamp: Date.now(),
    };
  }

  const { postId, body, stakeHp } = parsed.data;
  const visible = await loadVisiblePost(supabase, postId, profile ?? {});

  if (visible.error || !visible.post) {
    return { error: visible.error ?? "Post was not found.", stamp: Date.now() };
  }

  if (visible.access !== "full") {
    return { error: "Higher-tier desks are view-only.", stamp: Date.now() };
  }

  const debit = await debitProfileHp(supabase, userId, stakeHp);

  if (!debit.ok) {
    return { error: debit.error, stamp: Date.now() };
  }

  const { data: comment, error: commentError } = await supabase
    .from("research_comments")
    .insert({
      post_id: postId,
      author_id: userId,
      body,
      status: RESEARCH_POST_STATUS_LIVE,
      current_health: stakeHp,
      original_stake: stakeHp,
    })
    .select("id")
    .single();

  if (commentError || !comment) {
    await restoreProfileHp(supabase, userId, debit.previousHp);
    return {
      error: commentError?.message.includes("research_comments")
        ? "Comments are blocked. Run the comments SQL in Supabase."
        : (commentError?.message ?? "Failed to post comment."),
      stamp: Date.now(),
    };
  }

  const { error: txError } = await insertLedger(supabase, {
    user_id: userId,
    amount: stakeHp,
    type: HP_TRANSACTION_STAKE,
    post_id: postId,
    comment_id: comment.id,
    description: `Stake on comment ${comment.id}`,
  });

  if (txError) {
    refreshThread(postId);
    return {
      error: `Comment posted, but HP transaction failed: ${txError.message}`,
      stamp: Date.now(),
    };
  }

  const subTopic = resolveSubTopic(visible.post.sub_topic);

  if (subTopic) {
    const topic = await recordSubtopicParticipation(
      supabase,
      userId,
      subTopic,
      stakeHp
    );

    if (topic.error) {
      refreshThread(postId);
      return {
        error: `Comment posted, but topic rank failed: ${topic.error}`,
        stamp: Date.now(),
      };
    }
  }

  refreshThread(postId);
  return { message: "Comment posted.", stamp: Date.now() };
}

export async function voteOnComment(
  _prevState: ThreadActionState,
  formData: FormData
): Promise<ThreadActionState> {
  const { supabase, userId, profile } = await requireUser();
  const parsed = commentVoteSchema.safeParse({
    postId: formData.get("postId"),
    commentId: formData.get("commentId"),
    direction: formData.get("direction"),
    strength: formData.get("strength"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid vote.",
      stamp: Date.now(),
    };
  }

  const { postId, commentId, direction, strength } = parsed.data;
  const value = signedVoteValue(direction, strength);
  const cost = voteCostHp(strength);
  const visible = await loadVisiblePost(supabase, postId, profile ?? {});

  if (visible.error || !visible.post) {
    return { error: visible.error ?? "Post was not found.", stamp: Date.now() };
  }

  if (visible.access !== "full") {
    return { error: "Higher-tier desks are view-only.", stamp: Date.now() };
  }

  const { data: existingVote } = await supabase
    .from("comment_votes")
    .select("id")
    .eq("user_id", userId)
    .eq("comment_id", commentId)
    .maybeSingle();

  if (existingVote) {
    return { error: "You have already voted on this comment.", stamp: Date.now() };
  }

  const { data: comment, error: commentReadError } = await supabase
    .from("research_comments")
    .select("id, post_id, author_id, current_health, original_stake, status")
    .eq("id", commentId)
    .eq("post_id", postId)
    .maybeSingle();

  if (commentReadError || !comment) {
    return { error: "Comment was not found.", stamp: Date.now() };
  }

  if (comment.status === RESEARCH_POST_STATUS_ASCENDED) {
    return {
      error: "This comment has ascended and is closed to votes.",
      stamp: Date.now(),
    };
  }

  if (comment.status !== RESEARCH_POST_STATUS_LIVE) {
    return { error: "This comment is no longer live.", stamp: Date.now() };
  }

  const debit = await debitProfileHp(supabase, userId, cost);

  if (!debit.ok) {
    return { error: debit.error, stamp: Date.now() };
  }

  const healthAtVote = comment.current_health;
  const { error: voteError } = await supabase.from("comment_votes").insert({
    user_id: userId,
    comment_id: commentId,
    value,
    health_at_vote: healthAtVote,
  });

  if (voteError) {
    await restoreProfileHp(supabase, userId, debit.previousHp);
    if (voteError.code === "23505") {
      return {
        error: "You have already voted on this comment.",
        stamp: Date.now(),
      };
    }
    return { error: voteError.message, stamp: Date.now() };
  }

  let nextHealth = comment.current_health + voteHealthDelta(value);
  let nextStatus = RESEARCH_POST_STATUS_LIVE;
  let outcome: "live" | "hunt" | "ascent" = "live";

  if (nextHealth <= 0) {
    nextHealth = 0;
    nextStatus = RESEARCH_POST_STATUS_ARCHIVED;
    outcome = "hunt";
  } else if (nextHealth >= ascentLine(comment.original_stake)) {
    nextHealth = ascentLine(comment.original_stake);
    nextStatus = RESEARCH_POST_STATUS_ASCENDED;
    outcome = "ascent";
  }

  const { error: healthError } = await supabase
    .from("research_comments")
    .update({
      current_health: nextHealth,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (healthError) {
    refreshThread(postId);
    return {
      error: `Vote recorded, but health update failed: ${healthError.message}`,
      stamp: Date.now(),
    };
  }

  const { error: txError } = await insertLedger(supabase, {
    user_id: userId,
    amount: cost,
    type: HP_TRANSACTION_VOTE,
    post_id: postId,
    comment_id: commentId,
    description: `${direction === "up" ? "Upvote" : "Downvote"} ${voteStrength(value)} on comment ${commentId}`,
  });

  if (txError) {
    refreshThread(postId);
    return {
      error: `Vote recorded, but HP transaction failed: ${txError.message}`,
      stamp: Date.now(),
    };
  }

  const subTopic = resolveSubTopic(visible.post.sub_topic);

  if (subTopic) {
    const topic = await recordSubtopicParticipation(
      supabase,
      userId,
      subTopic,
      cost
    );

    if (topic.error) {
      refreshThread(postId);
      return {
        error: `Vote recorded, but topic rank failed: ${topic.error}`,
        stamp: Date.now(),
      };
    }
  }

  if (outcome === "hunt") {
    const settled = await settleHuntedComment(
      supabase,
      commentId,
      postId,
      comment.original_stake
    );

    if (settled.error) {
      refreshThread(postId);
      return {
        error: `Comment hunted, but bounty failed: ${settled.error}`,
        stamp: Date.now(),
      };
    }

    refreshThread(postId);
    return {
      message: "Comment hunted. Stake and ups paid to downvoters by timing.",
      stamp: Date.now(),
    };
  }

  if (outcome === "ascent") {
    const settled = await settleAscendedComment(
      supabase,
      commentId,
      postId,
      comment.author_id,
      comment.original_stake
    );

    if (settled.error) {
      refreshThread(postId);
      return {
        error: `Comment ascended, but harvest failed: ${settled.error}`,
        stamp: Date.now(),
      };
    }

    refreshThread(postId);
    return {
      message:
        "Comment ascended. Downvote HP harvested for early ups and the author.",
      stamp: Date.now(),
    };
  }

  refreshThread(postId);
  return { message: "Vote recorded.", stamp: Date.now() };
}

export async function createReply(
  _prevState: ThreadActionState,
  formData: FormData
): Promise<ThreadActionState> {
  const { supabase, userId, profile } = await requireUser();
  const parsed = replySchema.safeParse({
    postId: formData.get("postId"),
    commentId: formData.get("commentId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid reply.",
      stamp: Date.now(),
    };
  }

  const { postId, commentId, body } = parsed.data;
  const visible = await loadVisiblePost(supabase, postId, profile ?? {});

  if (visible.error || !visible.post) {
    return { error: visible.error ?? "Post was not found.", stamp: Date.now() };
  }

  const { data: comment } = await supabase
    .from("research_comments")
    .select("id")
    .eq("id", commentId)
    .eq("post_id", postId)
    .maybeSingle();

  if (!comment) {
    return { error: "Comment was not found.", stamp: Date.now() };
  }

  const { error } = await supabase.from("comment_replies").insert({
    comment_id: commentId,
    author_id: userId,
    body,
  });

  if (error) {
    return {
      error: error.message.includes("comment_replies")
        ? "Replies are blocked. Run the comments SQL in Supabase."
        : error.message,
      stamp: Date.now(),
    };
  }

  refreshThread(postId);
  return { message: "Reply posted.", stamp: Date.now() };
}

export async function toggleReplyLike(
  _prevState: ThreadActionState,
  formData: FormData
): Promise<ThreadActionState> {
  const { supabase, userId, profile } = await requireUser();
  const parsed = likeSchema.safeParse({
    postId: formData.get("postId"),
    replyId: formData.get("replyId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid like.",
      stamp: Date.now(),
    };
  }

  const { postId, replyId } = parsed.data;
  const visible = await loadVisiblePost(supabase, postId, profile ?? {});

  if (visible.error || !visible.post) {
    return { error: visible.error ?? "Post was not found.", stamp: Date.now() };
  }

  const { data: reply } = await supabase
    .from("comment_replies")
    .select("id, comment_id")
    .eq("id", replyId)
    .maybeSingle();

  if (!reply) {
    return { error: "Reply was not found.", stamp: Date.now() };
  }

  const { data: parent } = await supabase
    .from("research_comments")
    .select("id")
    .eq("id", reply.comment_id)
    .eq("post_id", postId)
    .maybeSingle();

  if (!parent) {
    return { error: "Reply was not found.", stamp: Date.now() };
  }

  const { data: existing } = await supabase
    .from("comment_reply_likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("reply_id", replyId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("comment_reply_likes")
        .delete()
        .eq("user_id", userId)
        .eq("reply_id", replyId)
    : await supabase.from("comment_reply_likes").insert({
        user_id: userId,
        reply_id: replyId,
      });

  if (error) {
    return {
      error: error.message.includes("comment_reply_likes")
        ? "Likes are blocked. Run the comments SQL in Supabase."
        : error.message,
      stamp: Date.now(),
    };
  }

  refreshThread(postId);
  return { stamp: Date.now() };
}
