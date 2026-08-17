"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { DEFAULT_STAKE_HP, VOTE_COST_HP, VOTE_HEALTH_DELTA } from "@/lib/research/economy";
import { debitProfileHp, restoreProfileHp } from "@/lib/research/hp";
import {
  HP_TRANSACTION_STAKE,
  HP_TRANSACTION_VOTE,
  RESEARCH_POST_STATUS_ARCHIVED,
  RESEARCH_POST_STATUS_LIVE,
  VOTE_DOWN,
  VOTE_UP,
} from "@/types";

export type FeedActionState = {
  error?: string;
  message?: string;
  stamp?: number;
};

const createPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  body: z.string().trim().min(1, "Body is required.").max(20000),
  stakeHp: z.coerce
    .number()
    .int("Stake must be a whole number.")
    .min(1, "Stake at least 1 HP."),
});

const voteSchema = z.object({
  postId: z.string().uuid("Invalid post."),
  value: z.coerce
    .number()
    .refine((value): value is typeof VOTE_UP | typeof VOTE_DOWN => {
      return value === VOTE_UP || value === VOTE_DOWN;
    }, "Invalid vote."),
});

function refreshFeed() {
  revalidatePath("/feed");
  revalidatePath("/dashboard");
}

export async function createResearchPost(
  _prevState: FeedActionState,
  formData: FormData
): Promise<FeedActionState> {
  const { supabase, userId } = await requireUser();
  const parsed = createPostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    stakeHp: formData.get("stakeHp") ?? DEFAULT_STAKE_HP,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
      stamp: Date.now(),
    };
  }

  const { title, body, stakeHp } = parsed.data;
  const debit = await debitProfileHp(supabase, userId, stakeHp);

  if (!debit.ok) {
    return { error: debit.error, stamp: Date.now() };
  }

  const { data: post, error: postError } = await supabase
    .from("research_posts")
    .insert({
      author_id: userId,
      title,
      body,
      status: RESEARCH_POST_STATUS_LIVE,
      current_health: stakeHp,
    })
    .select("id")
    .single();

  if (postError || !post) {
    await restoreProfileHp(supabase, userId, debit.previousHp);
    return {
      error: postError?.message ?? "Failed to publish research post.",
      stamp: Date.now(),
    };
  }

  const { error: txError } = await supabase.from("hp_transactions").insert({
    user_id: userId,
    amount: stakeHp,
    type: HP_TRANSACTION_STAKE,
    description: `Stake on research post ${post.id}`,
  });

  if (txError) {
    refreshFeed();
    return {
      error: `Post published, but HP transaction failed: ${txError.message}`,
      stamp: Date.now(),
    };
  }

  refreshFeed();
  return { message: "Research post published.", stamp: Date.now() };
}

export async function voteOnPost(
  _prevState: FeedActionState,
  formData: FormData
): Promise<FeedActionState> {
  const { supabase, userId } = await requireUser();
  const parsed = voteSchema.safeParse({
    postId: formData.get("postId"),
    value: formData.get("value"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid vote.",
      stamp: Date.now(),
    };
  }

  const { postId, value } = parsed.data;

  const { data: existingVote } = await supabase
    .from("votes")
    .select("id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (existingVote) {
    return { error: "You have already voted on this post.", stamp: Date.now() };
  }

  const { data: post, error: postReadError } = await supabase
    .from("research_posts")
    .select("id, current_health, status")
    .eq("id", postId)
    .maybeSingle();

  if (postReadError || !post) {
    return { error: "Post was not found.", stamp: Date.now() };
  }

  if (post.status !== RESEARCH_POST_STATUS_LIVE) {
    return { error: "This post is no longer live.", stamp: Date.now() };
  }

  const debit = await debitProfileHp(supabase, userId, VOTE_COST_HP);

  if (!debit.ok) {
    return { error: debit.error, stamp: Date.now() };
  }

  const { error: voteError } = await supabase.from("votes").insert({
    user_id: userId,
    post_id: postId,
    value,
  });

  if (voteError) {
    await restoreProfileHp(supabase, userId, debit.previousHp);
    if (voteError.code === "23505") {
      return { error: "You have already voted on this post.", stamp: Date.now() };
    }
    return { error: voteError.message, stamp: Date.now() };
  }

  const nextHealth = post.current_health + value * VOTE_HEALTH_DELTA;
  const nextStatus =
    nextHealth <= 0
      ? RESEARCH_POST_STATUS_ARCHIVED
      : RESEARCH_POST_STATUS_LIVE;

  const { error: healthError } = await supabase
    .from("research_posts")
    .update({
      current_health: nextHealth,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (healthError) {
    refreshFeed();
    return {
      error: `Vote recorded, but health update failed: ${healthError.message}`,
      stamp: Date.now(),
    };
  }

  const { error: txError } = await supabase.from("hp_transactions").insert({
    user_id: userId,
    amount: VOTE_COST_HP,
    type: HP_TRANSACTION_VOTE,
    description: `${value === VOTE_UP ? "Upvote" : "Downvote"} on research post ${postId}`,
  });

  if (txError) {
    refreshFeed();
    return {
      error: `Vote recorded, but HP transaction failed: ${txError.message}`,
      stamp: Date.now(),
    };
  }

  refreshFeed();
  return { message: "Vote recorded.", stamp: Date.now() };
}
