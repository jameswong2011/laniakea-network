"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getDeskAccess } from "@/lib/research/access";
import {
  DEFAULT_STAKE_HP,
  MAX_STAKE_HP,
  ascentLine,
  voteCostHp,
  voteHealthDelta,
} from "@/lib/research/economy";
import { researchPostPath } from "@/lib/research/feed";
import { debitProfileHp, restoreProfileHp } from "@/lib/research/hp";
import {
  settleAscendedPost,
  settleCommentsOnHuntedPost,
  settleHuntedPost,
} from "@/lib/research/settlement-apply";
import { recordSubtopicParticipation } from "@/lib/research/subtopic-ranks";
import {
  HP_TRANSACTION_STAKE,
  HP_TRANSACTION_VOTE,
  RESEARCH_POST_STATUS_ARCHIVED,
  RESEARCH_POST_STATUS_ASCENDED,
  RESEARCH_POST_STATUS_LIVE,
  VOTE_STRENGTH_MAX,
  VOTE_STRENGTH_MIN,
  isSubTopic,
  resolveSubTopic,
  signedVoteValue,
  voteStrength,
  type VoteDirection,
} from "@/types";

export type FeedActionState = {
  error?: string;
  message?: string;
  stamp?: number;
};

const createPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  body: z.string().trim().min(1, "Body is required.").max(20000),
  subTopic: z
    .string()
    .trim()
    .refine(isSubTopic, {
      message: "Select a sub-topic.",
    }),
  stakeHp: z.coerce
    .number()
    .int("Stake must be a whole number.")
    .min(1, "Stake at least 1 HP.")
    .max(MAX_STAKE_HP, `Stake at most ${MAX_STAKE_HP} HP.`),
});

const voteSchema = z.object({
  postId: z.string().uuid("Invalid post."),
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

function refreshFeed() {
  revalidatePath("/feed");
  revalidatePath("/feed", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/ranking");
  revalidatePath("/wallet");
}

export async function createResearchPost(
  _prevState: FeedActionState,
  formData: FormData
): Promise<FeedActionState> {
  const { supabase, userId } = await requireUser();
  const parsed = createPostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    subTopic: formData.get("subTopic"),
    stakeHp: formData.get("stakeHp") ?? DEFAULT_STAKE_HP,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid form data.",
      stamp: Date.now(),
    };
  }

  const { title, body, subTopic, stakeHp } = parsed.data;
  const debit = await debitProfileHp(supabase, userId, stakeHp);

  if (!debit.ok) {
    return { error: debit.error, stamp: Date.now() };
  }

  const withStake = await supabase
    .from("research_posts")
    .insert({
      author_id: userId,
      title,
      body,
      sub_topic: subTopic,
      status: RESEARCH_POST_STATUS_LIVE,
      current_health: stakeHp,
      original_stake: stakeHp,
    })
    .select("id")
    .single();

  const postInsert =
    withStake.error && withStake.error.message.includes("original_stake")
      ? await supabase
          .from("research_posts")
          .insert({
            author_id: userId,
            title,
            body,
            sub_topic: subTopic,
            status: RESEARCH_POST_STATUS_LIVE,
            current_health: stakeHp,
          })
          .select("id")
          .single()
      : withStake;

  const { data: post, error: postError } = postInsert;

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
    post_id: post.id,
    description: `Stake on ${subTopic} research post ${post.id}`,
  });

  if (txError) {
    refreshFeed();
    return {
      error: `Post published, but HP transaction failed: ${txError.message}`,
      stamp: Date.now(),
    };
  }

  const topic = await recordSubtopicParticipation(
    supabase,
    userId,
    subTopic,
    stakeHp
  );

  refreshFeed();

  if (topic.error) {
    return {
      error: `Post published, but topic rank failed: ${topic.error}`,
      stamp: Date.now(),
    };
  }

  redirect(researchPostPath(post.id));
}

export async function voteOnPost(
  _prevState: FeedActionState,
  formData: FormData
): Promise<FeedActionState> {
  const { supabase, userId, profile } = await requireUser();
  const parsed = voteSchema.safeParse({
    postId: formData.get("postId"),
    direction: formData.get("direction"),
    strength: formData.get("strength"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid vote.",
      stamp: Date.now(),
    };
  }

  const { postId, direction, strength } = parsed.data;
  const value = signedVoteValue(direction, strength);
  const cost = voteCostHp(strength);

  const { data: existingVote } = await supabase
    .from("votes")
    .select("id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (existingVote) {
    return { error: "You have already voted on this post.", stamp: Date.now() };
  }

  const postRead = await supabase
    .from("research_posts")
    .select("id, author_id, current_health, original_stake, status, sub_topic")
    .eq("id", postId)
    .maybeSingle();

  const { data: post, error: postReadError } =
    postRead.error && postRead.error.message.includes("original_stake")
      ? await supabase
          .from("research_posts")
          .select("id, author_id, current_health, status, sub_topic")
          .eq("id", postId)
          .maybeSingle()
      : postRead;

  if (postReadError || !post) {
    return { error: "Post was not found.", stamp: Date.now() };
  }

  if (post.status === RESEARCH_POST_STATUS_ASCENDED) {
    return { error: "This post has ascended and is closed to votes.", stamp: Date.now() };
  }

  if (post.status !== RESEARCH_POST_STATUS_LIVE) {
    return { error: "This post is no longer live.", stamp: Date.now() };
  }

  const healthAtVote = post.current_health;
  const originalStake =
    "original_stake" in post && typeof post.original_stake === "number"
      ? post.original_stake
      : post.current_health;

  const { data: author } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", post.author_id)
    .maybeSingle();

  const access = getDeskAccess(
    profile?.tier,
    author?.tier,
    profile?.role === "admin"
  );

  if (access !== "full") {
    return {
      error: "Higher-tier desks are view-only.",
      stamp: Date.now(),
    };
  }

  const debit = await debitProfileHp(supabase, userId, cost);

  if (!debit.ok) {
    return { error: debit.error, stamp: Date.now() };
  }

  // Snapshot health at the instant of the vote for continuous settlement.
  const withHealth = await supabase.from("votes").insert({
    user_id: userId,
    post_id: postId,
    value,
    health_at_vote: healthAtVote,
  });

  const voteInsert =
    withHealth.error && withHealth.error.message.includes("health_at_vote")
      ? await supabase.from("votes").insert({
          user_id: userId,
          post_id: postId,
          value,
        })
      : withHealth;

  const voteError = voteInsert.error;

  if (voteError) {
    await restoreProfileHp(supabase, userId, debit.previousHp);
    if (voteError.code === "23505") {
      return { error: "You have already voted on this post.", stamp: Date.now() };
    }
    if (
      voteError.message.includes("votes_value_check") ||
      voteError.code === "23514"
    ) {
      return {
        error:
          "Vote scale 1–5 is blocked by the database check. Run the vote-scale SQL in Supabase, then try again.",
        stamp: Date.now(),
      };
    }
    return { error: voteError.message, stamp: Date.now() };
  }

  let nextHealth = post.current_health + voteHealthDelta(value);
  let nextStatus = RESEARCH_POST_STATUS_LIVE;
  let outcome: "live" | "hunt" | "ascent" = "live";

  if (nextHealth <= 0) {
    nextHealth = 0;
    nextStatus = RESEARCH_POST_STATUS_ARCHIVED;
    outcome = "hunt";
  } else if (nextHealth >= ascentLine(originalStake)) {
    nextHealth = ascentLine(originalStake);
    nextStatus = RESEARCH_POST_STATUS_ASCENDED;
    outcome = "ascent";
  }

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
      error:
        healthError.message.includes("status") ||
        healthError.message.includes("ascended")
          ? "Vote recorded, but ascent/archive status is blocked. Run the settlement SQL in Supabase."
          : `Vote recorded, but health update failed: ${healthError.message}`,
      stamp: Date.now(),
    };
  }

  const { error: txError } = await supabase.from("hp_transactions").insert({
    user_id: userId,
    amount: cost,
    type: HP_TRANSACTION_VOTE,
    post_id: postId,
    description: `${direction === "up" ? "Upvote" : "Downvote"} ${voteStrength(value)} on research post ${postId}`,
  });

  if (txError) {
    refreshFeed();
    return {
      error: `Vote recorded, but HP transaction failed: ${txError.message}`,
      stamp: Date.now(),
    };
  }

  const subTopic = resolveSubTopic(post.sub_topic);

  if (subTopic) {
    const topic = await recordSubtopicParticipation(
      supabase,
      userId,
      subTopic,
      cost
    );

    if (topic.error) {
      refreshFeed();
      return {
        error: `Vote recorded, but topic rank failed: ${topic.error}`,
        stamp: Date.now(),
      };
    }
  }

  if (outcome === "hunt") {
    const settled = await settleHuntedPost(supabase, postId, originalStake);

    if (settled.error) {
      refreshFeed();
      return {
        error: `Note hunted, but bounty failed: ${settled.error}`,
        stamp: Date.now(),
      };
    }

    const comments = await settleCommentsOnHuntedPost(supabase, postId);

    if (comments.error) {
      refreshFeed();
      return {
        error: `Note hunted, but comment cascade failed: ${comments.error}`,
        stamp: Date.now(),
      };
    }

    refreshFeed();
    return {
      message:
        "Note hunted. Losing comments settled; winning comments refunded vote HP.",
      stamp: Date.now(),
    };
  }

  if (outcome === "ascent") {
    const settled = await settleAscendedPost(
      supabase,
      postId,
      post.author_id,
      originalStake
    );

    if (settled.error) {
      refreshFeed();
      return {
        error: `Note ascended, but harvest failed: ${settled.error}`,
        stamp: Date.now(),
      };
    }

    refreshFeed();
    return {
      message: "Note ascended. Downvote HP harvested for early ups and the author.",
      stamp: Date.now(),
    };
  }

  refreshFeed();
  return { message: "Vote recorded.", stamp: Date.now() };
}
