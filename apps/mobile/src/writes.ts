import {
  BUY_HP_CAP,
  DEFAULT_UNLOCK_RATE_MULTIPLE,
  HP_PER_UTILITY_TOKEN,
  MASTERS_CASHOUT_RESERVE_HP,
  MAX_STAKE_HP,
  RESEARCH_POST_STATUS_ARCHIVED,
  RESEARCH_POST_STATUS_ASCENDED,
  RESEARCH_POST_STATUS_LIVE,
  RESEARCH_POST_STATUS_REFUNDED,
  STARTING_HP,
  UNLOCK_RATE_MULTIPLE_MAX,
  UNLOCK_RATE_MULTIPLE_MIN,
  ascentLine,
  canBuyHp,
  canCashOutHp,
  canWriteDesk,
  maxBuyHpTokens,
  resolveTier,
  researchExcerpt,
  resolveUnlockRateMultiple,
  voteCostHp,
  voteHealthDelta,
  voteStrength,
  type DeskAccess,
} from "./domain";
import { requestNoteBrief } from "./ai";
import { supabase } from "./supabase";
import {
  COMMENT_BODY_MAX,
  HP_TRANSACTION_BUY,
  HP_TRANSACTION_CASHOUT,
  HP_TRANSACTION_REFUND,
  HP_TRANSACTION_STAKE,
  HP_TRANSACTION_VOTE,
  REPLY_BODY_MAX,
  compareTierThenHp,
  isSubTopic,
  signedVoteValue,
  type VoteDirection,
} from "../../../src/types";
import {
  INVITE_PURCHASE_UTL,
  isInviteCodeFormat,
  normalizeInviteCode,
} from "../../../src/lib/research/referral";
import {
  orderSearchPosts,
  searchExcerpt,
  searchPattern,
  searchTerms,
  textHasTerms,
} from "../../../src/lib/research/search";

export type WriteResult = {
  error?: string;
  message?: string;
  id?: string;
};

const REACTION_KEYS = [
  "agree",
  "disagree",
  "detailed",
  "non_consensus",
  "informative",
  "funny",
] as const;

export type ReactionKey = (typeof REACTION_KEYS)[number];

export const REACTION_LABELS: Record<ReactionKey, string> = {
  agree: "Agree",
  disagree: "Disagree",
  detailed: "Detailed",
  non_consensus: "Non-consensus",
  informative: "Informative",
  funny: "Funny",
};

export type ReactionCount = {
  key: ReactionKey;
  count: number;
  mine: boolean;
};

export function emptyReactionCounts(): ReactionCount[] {
  return REACTION_KEYS.map((key) => ({ key, count: 0, mine: false }));
}

export function applyReactionToggle(counts: ReactionCount[], key: ReactionKey): ReactionCount[] {
  return counts.map((row) => {
    if (row.key !== key) {
      return row;
    }

    const mine = !row.mine;
    return { ...row, mine, count: Math.max(0, row.count + (mine ? 1 : -1)) };
  });
}

function clean(message: string) {
  return message.replace(/^ERROR:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/, "");
}

function whole(value: number, label: string) {
  if (!Number.isInteger(value)) {
    return `${label} must be a whole number.`;
  }

  return null;
}

async function debitHp(userId: string, amount: number) {
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("current_hp")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    return { ok: false as const, error: readError.message };
  }

  if (!profile) {
    return { ok: false as const, error: "Profile was not found." };
  }

  if (profile.current_hp < amount) {
    return {
      ok: false as const,
      error: `Insufficient HP. Need ${amount}, have ${profile.current_hp}.`,
    };
  }

  const nextHp = profile.current_hp - amount;
  const { data: updated, error: writeError } = await supabase
    .from("profiles")
    .update({ current_hp: nextHp, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("current_hp", profile.current_hp)
    .select("current_hp")
    .maybeSingle();

  if (writeError) {
    return { ok: false as const, error: writeError.message };
  }

  if (!updated) {
    return { ok: false as const, error: "HP changed. Try again." };
  }

  return { ok: true as const, previousHp: profile.current_hp as number };
}

async function restoreHp(userId: string, previousHp: number) {
  await supabase
    .from("profiles")
    .update({ current_hp: previousHp, updated_at: new Date().toISOString() })
    .eq("id", userId);
}

async function creditHp(userId: string, amount: number) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("current_hp")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return { error: error?.message ?? "Profile was not found." };
  }

  const { data: updated, error: writeError } = await supabase
    .from("profiles")
    .update({
      current_hp: profile.current_hp + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("current_hp", profile.current_hp)
    .select("current_hp")
    .maybeSingle();

  if (writeError || !updated) {
    return { error: writeError?.message ?? "Could not credit this desk." };
  }

  return { error: null };
}

async function insertRefund(input: {
  userId: string;
  amount: number;
  postId: string;
  commentId: string;
  description: string;
}) {
  const credit = await creditHp(input.userId, input.amount);

  if (credit.error) {
    return credit;
  }

  const { error } = await supabase.from("hp_transactions").insert({
    user_id: input.userId,
    amount: input.amount,
    type: HP_TRANSACTION_REFUND,
    post_id: input.postId,
    comment_id: input.commentId,
    description: input.description,
  });

  return { error: error?.message ?? null };
}

async function recordTopic(userId: string, subTopic: string, hpDelta: number) {
  const { data: existing, error: readError } = await supabase
    .from("subtopic_ranks")
    .select("current_hp")
    .eq("user_id", userId)
    .eq("sub_topic", subTopic)
    .maybeSingle();

  if (readError) {
    return readError.message;
  }

  const now = new Date().toISOString();

  if (!existing) {
    const { error } = await supabase.from("subtopic_ranks").insert({
      user_id: userId,
      sub_topic: subTopic,
      tier: "Bronze",
      current_hp: Math.max(hpDelta, 0),
      updated_at: now,
    });
    return error?.message ?? null;
  }

  const { error } = await supabase
    .from("subtopic_ranks")
    .update({ current_hp: existing.current_hp + hpDelta, updated_at: now })
    .eq("user_id", userId)
    .eq("sub_topic", subTopic);

  return error?.message ?? null;
}

async function walletMove(userId: string, hpDelta: number, tokenDelta: number) {
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("current_hp, utility_tokens")
    .eq("id", userId)
    .maybeSingle();

  if (readError || !profile) {
    return { ok: false as const, error: readError?.message ?? "Profile was not found." };
  }

  const nextHp = profile.current_hp + hpDelta;
  const nextTokens = profile.utility_tokens + tokenDelta;

  if (nextHp < 0) {
    return { ok: false as const, error: "Insufficient HP." };
  }

  if (nextTokens < 0) {
    return { ok: false as const, error: "Insufficient UTL." };
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

  if (writeError || !updated) {
    return { ok: false as const, error: writeError?.message ?? "Wallet changed. Try again." };
  }

  if (tokenDelta !== 0) {
    await supabase.from("token_ledger").insert({
      user_id: userId,
      amount: Math.abs(tokenDelta),
      direction: tokenDelta > 0 ? "credit" : "debit",
      reason: tokenDelta > 0 ? "cashout" : "buy_hp",
      metadata: { source: "wallet" },
    });
  }

  return {
    ok: true as const,
    currentHp: updated.current_hp as number,
    utilityTokens: updated.utility_tokens as number,
  };
}

export async function publishNote(input: {
  userId: string;
  title: string;
  body: string;
  subTopic: string;
  stakeHp: number;
  unlockRateMultiple: number;
  draftId?: string;
}): Promise<WriteResult> {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title || title.length > 200) {
    return { error: "Title is required." };
  }

  if (!body || body.length > 20000) {
    return { error: "Body is required." };
  }

  if (!isSubTopic(input.subTopic)) {
    return { error: "Select a sector." };
  }

  const stakeError = whole(input.stakeHp, "Stake");

  if (stakeError || input.stakeHp < 1 || input.stakeHp > MAX_STAKE_HP) {
    return { error: stakeError ?? `Stake at most ${MAX_STAKE_HP} HP.` };
  }

  if (
    input.unlockRateMultiple < UNLOCK_RATE_MULTIPLE_MIN ||
    input.unlockRateMultiple > UNLOCK_RATE_MULTIPLE_MAX
  ) {
    return { error: `Unlock rate is ${UNLOCK_RATE_MULTIPLE_MIN}–${UNLOCK_RATE_MULTIPLE_MAX}×.` };
  }

  const debit = await debitHp(input.userId, input.stakeHp);

  if (!debit.ok) {
    return { error: debit.error };
  }

  const multiple = resolveUnlockRateMultiple(input.unlockRateMultiple);
  const inserted = await supabase
    .from("research_posts")
    .insert({
      author_id: input.userId,
      title,
      body,
      sub_topic: input.subTopic,
      status: RESEARCH_POST_STATUS_LIVE,
      current_health: input.stakeHp,
      original_stake: input.stakeHp,
      unlock_rate_multiple: multiple,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    await restoreHp(input.userId, debit.previousHp);
    return { error: inserted.error?.message ?? "Failed to publish." };
  }

  await supabase.from("hp_transactions").insert({
    user_id: input.userId,
    amount: input.stakeHp,
    type: HP_TRANSACTION_STAKE,
    post_id: inserted.data.id,
    description: `Stake on ${input.subTopic} research post ${inserted.data.id}`,
  });

  const topicError = await recordTopic(input.userId, input.subTopic, input.stakeHp);

  if (input.draftId) {
    await supabase
      .from("content_drafts")
      .delete()
      .eq("id", input.draftId)
      .eq("user_id", input.userId)
      .eq("kind", "post");
  }

  const followers = await supabase
    .from("author_subscriptions")
    .select("subscriber_id")
    .eq("author_id", input.userId);

  if (!followers.error && followers.data?.length) {
    await supabase.from("notifications").insert(
      followers.data.map((row) => ({
        user_id: row.subscriber_id,
        actor_id: input.userId,
        kind: "author_post",
        post_id: inserted.data.id,
      }))
    );
  }

  if (topicError) {
    return { id: inserted.data.id, error: `Post published, but topic rank failed: ${topicError}` };
  }

  void requestNoteBrief(inserted.data.id);

  return { id: inserted.data.id, message: "Note published." };
}

export async function saveNoteDraft(input: {
  userId: string;
  draftId?: string;
  title: string;
  body: string;
  subTopic: string;
  stakeHp: number;
  unlockRateMultiple: number;
}): Promise<WriteResult> {
  const now = new Date().toISOString();
  const payload = {
    user_id: input.userId,
    kind: "post",
    post_id: null,
    title: input.title.slice(0, 200),
    body: input.body.slice(0, 20000),
    sub_topic: input.subTopic || null,
    stake_hp: input.stakeHp,
    unlock_rate_multiple: input.unlockRateMultiple,
    updated_at: now,
  };

  if (input.draftId) {
    const write = await supabase
      .from("content_drafts")
      .update(payload)
      .eq("id", input.draftId)
      .eq("user_id", input.userId)
      .select("id")
      .maybeSingle();

    if (write.error) {
      return { error: write.error.message };
    }

    return { id: write.data?.id ?? input.draftId, message: "Draft saved." };
  }

  const write = await supabase
    .from("content_drafts")
    .insert({ ...payload, created_at: now })
    .select("id")
    .single();

  if (write.error) {
    return { error: write.error.message };
  }

  return { id: write.data.id, message: "Draft saved." };
}

async function settlePostComments(postId: string) {
  const { data, error } = await supabase
    .from("research_comments")
    .select("id, author_id, current_health, original_stake, status")
    .eq("post_id", postId);

  if (error) {
    return error.message.includes("research_comments") ? null : error.message;
  }

  for (const comment of data ?? []) {
    if (comment.status !== RESEARCH_POST_STATUS_LIVE) {
      continue;
    }

    if (comment.current_health < comment.original_stake) {
      const hunted = await supabase.rpc("settle_hunted_comment", {
        p_comment_id: comment.id,
        p_post_id: postId,
      });

      if (hunted.error) {
        return clean(hunted.error.message);
      }

      await supabase
        .from("research_comments")
        .update({
          status: RESEARCH_POST_STATUS_ARCHIVED,
          current_health: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", comment.id);
      continue;
    }

    const votes = await supabase
      .from("comment_votes")
      .select("user_id, value")
      .eq("comment_id", comment.id);

    if (votes.error) {
      return votes.error.message;
    }

    for (const vote of votes.data ?? []) {
      const amount = voteStrength(vote.value as number);

      if (amount <= 0) {
        continue;
      }

      const refund = await insertRefund({
        userId: vote.user_id as string,
        amount,
        postId,
        commentId: comment.id as string,
        description: `Vote refund on comment ${comment.id} (parent hunted)`,
      });

      if (refund.error) {
        return refund.error;
      }
    }

    if ((comment.original_stake as number) > 0) {
      const stakeBack = await insertRefund({
        userId: comment.author_id as string,
        amount: comment.original_stake as number,
        postId,
        commentId: comment.id as string,
        description: `Stake refund on comment ${comment.id} (parent hunted)`,
      });

      if (stakeBack.error) {
        return stakeBack.error;
      }
    }

    const frozen = await supabase
      .from("research_comments")
      .update({
        status: RESEARCH_POST_STATUS_REFUNDED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", comment.id);

    if (frozen.error) {
      return frozen.error.message;
    }
  }

  return null;
}

export async function voteOnNote(input: {
  userId: string;
  postId: string;
  direction: VoteDirection;
  strength: number;
  access: DeskAccess;
}): Promise<WriteResult> {
  if (input.strength < 1 || input.strength > 5 || !Number.isInteger(input.strength)) {
    return { error: "Conviction is 1–5." };
  }

  if (input.access === "hidden") {
    return { error: "This desk is locked. Unlock it with UTL to read and engage." };
  }

  if (!canWriteDesk(input.access)) {
    return { error: "Higher-tier desks are view-only until you unlock them." };
  }

  const value = signedVoteValue(input.direction, input.strength);
  const cost = voteCostHp(input.strength);
  const existing = await supabase
    .from("votes")
    .select("id")
    .eq("user_id", input.userId)
    .eq("post_id", input.postId)
    .maybeSingle();

  if (existing.data) {
    return { error: "You have already voted on this post." };
  }

  const postRead = await supabase
    .from("research_posts")
    .select("id, author_id, current_health, original_stake, status, sub_topic")
    .eq("id", input.postId)
    .maybeSingle();

  if (postRead.error || !postRead.data) {
    return { error: "Post was not found." };
  }

  const post = postRead.data;

  if (post.status === RESEARCH_POST_STATUS_ASCENDED) {
    return { error: "This post has ascended and is closed to votes." };
  }

  if (post.status !== RESEARCH_POST_STATUS_LIVE) {
    return { error: "This post is no longer live." };
  }

  const stake = post.original_stake ?? post.current_health;
  const debit = await debitHp(input.userId, cost);

  if (!debit.ok) {
    return { error: debit.error };
  }

  const voteInsert = await supabase.from("votes").insert({
    user_id: input.userId,
    post_id: input.postId,
    value,
    health_at_vote: post.current_health,
  });

  if (voteInsert.error) {
    await restoreHp(input.userId, debit.previousHp);
    return { error: clean(voteInsert.error.message) };
  }

  let nextHealth = post.current_health + voteHealthDelta(value);
  let nextStatus: string = RESEARCH_POST_STATUS_LIVE;
  let outcome: "live" | "hunt" | "ascent" = "live";

  if (nextHealth <= 0) {
    nextHealth = 0;
    nextStatus = RESEARCH_POST_STATUS_ARCHIVED;
    outcome = "hunt";
  } else if (nextHealth >= ascentLine(stake)) {
    nextHealth = ascentLine(stake);
    nextStatus = RESEARCH_POST_STATUS_ASCENDED;
    outcome = "ascent";
  }

  const health = await supabase
    .from("research_posts")
    .update({
      current_health: nextHealth,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.postId);

  if (health.error) {
    return { error: `Vote recorded, but health update failed: ${health.error.message}` };
  }

  await supabase.from("hp_transactions").insert({
    user_id: input.userId,
    amount: cost,
    type: HP_TRANSACTION_VOTE,
    post_id: input.postId,
    description: `${input.direction === "up" ? "Upvote" : "Downvote"} ${voteStrength(value)} on research post ${input.postId}`,
  });

  if (isSubTopic(post.sub_topic ?? "")) {
    const topicError = await recordTopic(input.userId, post.sub_topic as string, cost);

    if (topicError) {
      return { error: `Vote recorded, but topic rank failed: ${topicError}` };
    }
  }

  if (outcome === "hunt") {
    const settled = await supabase.rpc("settle_hunted_post", { p_post_id: input.postId });

    if (settled.error) {
      return { error: `Note hunted, but bounty failed: ${clean(settled.error.message)}` };
    }

    const comments = await settlePostComments(input.postId);

    if (comments) {
      return { error: `Note hunted, but comment cascade failed: ${comments}` };
    }

    return { message: "Note hunted. Losing comments settled; winning comments refunded vote HP." };
  }

  if (outcome === "ascent") {
    const settled = await supabase.rpc("settle_ascended_post", { p_post_id: input.postId });

    if (settled.error) {
      return { error: `Note ascended, but harvest failed: ${clean(settled.error.message)}` };
    }

    return { message: "Note ascended. Downvote HP harvested for early ups and the author." };
  }

  return { message: "Vote recorded." };
}

export async function publishComment(input: {
  userId: string;
  postId: string;
  body: string;
  stakeHp: number;
  access: DeskAccess;
  postStatus: string;
  subTopic: string;
  postAuthorId: string;
}): Promise<WriteResult> {
  const body = input.body.trim();

  if (!body || body.length > COMMENT_BODY_MAX) {
    return { error: "Comment is required." };
  }

  const stakeError = whole(input.stakeHp, "Stake");

  if (stakeError || input.stakeHp < 1 || input.stakeHp > MAX_STAKE_HP) {
    return { error: stakeError ?? `Stake at most ${MAX_STAKE_HP} HP.` };
  }

  if (input.access === "hidden") {
    return { error: "This desk is locked. Unlock it with UTL to read and engage." };
  }

  if (!canWriteDesk(input.access)) {
    return { error: "Higher-tier desks are view-only until you unlock them." };
  }

  if (input.postStatus === RESEARCH_POST_STATUS_ARCHIVED) {
    return { error: "This post has been hunted. Comments are closed." };
  }

  const debit = await debitHp(input.userId, input.stakeHp);

  if (!debit.ok) {
    return { error: debit.error };
  }

  const inserted = await supabase
    .from("research_comments")
    .insert({
      post_id: input.postId,
      author_id: input.userId,
      body,
      status: RESEARCH_POST_STATUS_LIVE,
      current_health: input.stakeHp,
      original_stake: input.stakeHp,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    await restoreHp(input.userId, debit.previousHp);
    return { error: inserted.error?.message ?? "Failed to post comment." };
  }

  await supabase.from("hp_transactions").insert({
    user_id: input.userId,
    amount: input.stakeHp,
    type: HP_TRANSACTION_STAKE,
    post_id: input.postId,
    comment_id: inserted.data.id,
    description: `Stake on comment ${inserted.data.id}`,
  });

  if (isSubTopic(input.subTopic)) {
    await recordTopic(input.userId, input.subTopic, input.stakeHp);
  }

  await supabase
    .from("content_drafts")
    .delete()
    .eq("user_id", input.userId)
    .eq("kind", "comment")
    .eq("post_id", input.postId);

  const recipients = new Set<string>();

  if (input.postAuthorId !== input.userId) {
    recipients.add(input.postAuthorId);
  }

  const subs = await supabase
    .from("post_subscriptions")
    .select("user_id")
    .eq("post_id", input.postId);

  for (const row of subs.data ?? []) {
    if (row.user_id !== input.userId) {
      recipients.add(row.user_id as string);
    }
  }

  if (recipients.size > 0) {
    await supabase.from("notifications").insert(
      [...recipients].map((userId) => ({
        user_id: userId,
        actor_id: input.userId,
        kind: "comment_on_post",
        post_id: input.postId,
        comment_id: inserted.data.id,
      }))
    );
  }

  await supabase.from("post_subscriptions").upsert(
    { user_id: input.userId, post_id: input.postId },
    { onConflict: "user_id,post_id" }
  );

  return { id: inserted.data.id, message: "Comment posted." };
}

export async function loadCommentVotes(userId: string, commentIds: string[]) {
  const votes: Record<string, number> = {};

  if (commentIds.length === 0) {
    return votes;
  }

  const { data } = await supabase
    .from("comment_votes")
    .select("comment_id, value")
    .eq("user_id", userId)
    .in("comment_id", commentIds);

  for (const row of data ?? []) {
    votes[row.comment_id as string] = row.value as number;
  }

  return votes;
}

export async function voteOnComment(input: {
  userId: string;
  postId: string;
  commentId: string;
  direction: VoteDirection;
  strength: number;
  access: DeskAccess;
  postStatus: string;
  subTopic: string;
}): Promise<WriteResult> {
  if (input.strength < 1 || input.strength > 5) {
    return { error: "A comment vote is 1–5 HP." };
  }

  if (!canWriteDesk(input.access)) {
    return { error: "Higher-tier desks are view-only until you unlock them." };
  }

  if (input.postStatus === RESEARCH_POST_STATUS_ARCHIVED) {
    return { error: "This post has been hunted. Comment votes are closed." };
  }

  const existing = await supabase
    .from("comment_votes")
    .select("id")
    .eq("user_id", input.userId)
    .eq("comment_id", input.commentId)
    .maybeSingle();

  if (existing.data) {
    return { error: "You have already voted on this comment." };
  }

  const commentRead = await supabase
    .from("research_comments")
    .select("id, author_id, current_health, original_stake, status")
    .eq("id", input.commentId)
    .eq("post_id", input.postId)
    .maybeSingle();

  if (commentRead.error || !commentRead.data) {
    return { error: "Comment was not found." };
  }

  const comment = commentRead.data;

  if (comment.status !== RESEARCH_POST_STATUS_LIVE) {
    return { error: "This comment is no longer live." };
  }

  const value = signedVoteValue(input.direction, input.strength);
  const cost = voteCostHp(input.strength);
  const debit = await debitHp(input.userId, cost);

  if (!debit.ok) {
    return { error: debit.error };
  }

  const voteInsert = await supabase.from("comment_votes").insert({
    user_id: input.userId,
    comment_id: input.commentId,
    value,
    health_at_vote: comment.current_health,
  });

  if (voteInsert.error) {
    await restoreHp(input.userId, debit.previousHp);
    return { error: clean(voteInsert.error.message) };
  }

  const stake = comment.original_stake ?? comment.current_health;
  let nextHealth = comment.current_health + voteHealthDelta(value);
  let nextStatus: string = RESEARCH_POST_STATUS_LIVE;
  let outcome: "live" | "hunt" | "ascent" = "live";

  if (nextHealth <= 0) {
    nextHealth = 0;
    nextStatus = RESEARCH_POST_STATUS_ARCHIVED;
    outcome = "hunt";
  } else if (nextHealth >= ascentLine(stake)) {
    nextHealth = ascentLine(stake);
    nextStatus = RESEARCH_POST_STATUS_ASCENDED;
    outcome = "ascent";
  }

  await supabase
    .from("research_comments")
    .update({
      current_health: nextHealth,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.commentId);

  await supabase.from("hp_transactions").insert({
    user_id: input.userId,
    amount: cost,
    type: HP_TRANSACTION_VOTE,
    post_id: input.postId,
    comment_id: input.commentId,
    description: `${input.direction === "up" ? "Upvote" : "Downvote"} ${voteStrength(value)} on comment ${input.commentId}`,
  });

  if (isSubTopic(input.subTopic)) {
    await recordTopic(input.userId, input.subTopic, cost);
  }

  if (outcome === "hunt") {
    const settled = await supabase.rpc("settle_hunted_comment", {
      p_comment_id: input.commentId,
      p_post_id: input.postId,
    });

    if (settled.error) {
      return { error: `Comment hunted, but bounty failed: ${clean(settled.error.message)}` };
    }

    return { message: "Comment hunted. Stake and ups paid to downvoters by timing." };
  }

  if (outcome === "ascent") {
    const settled = await supabase.rpc("settle_ascended_comment", {
      p_comment_id: input.commentId,
      p_post_id: input.postId,
    });

    if (settled.error) {
      return { error: `Comment ascended, but harvest failed: ${clean(settled.error.message)}` };
    }

    return { message: "Comment ascended. Downvote HP harvested for early ups and the author." };
  }

  return { message: "Vote recorded." };
}

export async function publishReply(input: {
  userId: string;
  postId: string;
  commentId: string;
  body: string;
  access: DeskAccess;
}): Promise<WriteResult> {
  const body = input.body.trim();

  if (!body || body.length > REPLY_BODY_MAX) {
    return { error: "Reply is required." };
  }

  if (!canWriteDesk(input.access)) {
    return { error: "Higher-tier desks are view-only until you unlock them." };
  }

  const comment = await supabase
    .from("research_comments")
    .select("id, author_id")
    .eq("id", input.commentId)
    .eq("post_id", input.postId)
    .maybeSingle();

  if (!comment.data) {
    return { error: "Comment was not found." };
  }

  const inserted = await supabase.from("comment_replies").insert({
    comment_id: input.commentId,
    author_id: input.userId,
    body,
  });

  if (inserted.error) {
    return { error: inserted.error.message };
  }

  if (comment.data.author_id !== input.userId) {
    await supabase.from("notifications").insert({
      user_id: comment.data.author_id,
      actor_id: input.userId,
      kind: "reply_to_comment",
      post_id: input.postId,
      comment_id: input.commentId,
    });
  }

  return { message: "Reply posted." };
}

export async function buyHp(input: { userId: string; tier: string; tokens: number; currentHp: number }) {
  const tier = resolveTier(input.tier);

  if (!tier || !canBuyHp(tier)) {
    return { error: "Buy HP is available to Bronze only." };
  }

  if (!Number.isInteger(input.tokens) || input.tokens < 1) {
    return { error: "Spend at least 1 UTL." };
  }

  const room = maxBuyHpTokens(input.currentHp);

  if (room < 1) {
    return {
      error:
        input.currentHp >= BUY_HP_CAP
          ? `Already at ${BUY_HP_CAP} HP. Bronze can only restore up to that cap.`
          : `Not enough room under ${BUY_HP_CAP} HP.`,
    };
  }

  if (input.tokens > room) {
    return { error: `Room for ${room} UTL (${room * HP_PER_UTILITY_TOKEN} HP).` };
  }

  const referred = await supabase.rpc("buy_hp_with_referral", { p_tokens: input.tokens });

  if (!referred.error) {
    return { message: `Bought ${input.tokens * HP_PER_UTILITY_TOKEN} HP for ${input.tokens} UTL.` };
  }

  if (
    !referred.error.message.includes("buy_hp_with_referral") &&
    !referred.error.message.includes("does not exist")
  ) {
    return { error: clean(referred.error.message) };
  }

  const move = await walletMove(input.userId, input.tokens * HP_PER_UTILITY_TOKEN, -input.tokens);

  if (!move.ok) {
    return { error: move.error };
  }

  const ledger = await supabase.from("hp_transactions").insert({
    user_id: input.userId,
    amount: input.tokens * HP_PER_UTILITY_TOKEN,
    type: HP_TRANSACTION_BUY,
    description: `Bought ${input.tokens * HP_PER_UTILITY_TOKEN} HP with ${input.tokens} UTL`,
  });

  if (ledger.error) {
    await walletMove(input.userId, -(input.tokens * HP_PER_UTILITY_TOKEN), input.tokens);
    return { error: ledger.error.message };
  }

  return {
    message: `Bought ${input.tokens * HP_PER_UTILITY_TOKEN} HP for ${input.tokens} UTL. Balance ${move.currentHp} HP / ${move.utilityTokens} UTL.`,
  };
}

export async function cashOutHp(input: { userId: string; tier: string; hp: number; currentHp: number }) {
  const tier = resolveTier(input.tier);

  if (!tier || !canCashOutHp(tier)) {
    return { error: "Cash out is available to Masters only." };
  }

  if (!Number.isInteger(input.hp) || input.hp < HP_PER_UTILITY_TOKEN) {
    return { error: `Cash out at least ${HP_PER_UTILITY_TOKEN} HP.` };
  }

  if (input.hp % HP_PER_UTILITY_TOKEN !== 0) {
    return { error: `Cash out HP in multiples of ${HP_PER_UTILITY_TOKEN}.` };
  }

  if (input.currentHp - input.hp < MASTERS_CASHOUT_RESERVE_HP) {
    return { error: `Keep at least ${MASTERS_CASHOUT_RESERVE_HP} HP in reserve.` };
  }

  const tokens = input.hp / HP_PER_UTILITY_TOKEN;
  const move = await walletMove(input.userId, -input.hp, tokens);

  if (!move.ok) {
    return { error: move.error };
  }

  const ledger = await supabase.from("hp_transactions").insert({
    user_id: input.userId,
    amount: input.hp,
    type: HP_TRANSACTION_CASHOUT,
    description: `Cashed out ${input.hp} HP for ${tokens} UTL`,
  });

  if (ledger.error) {
    await walletMove(input.userId, input.hp, -tokens);
    return { error: ledger.error.message };
  }

  return {
    message: `Cashed out ${input.hp} HP for ${tokens} UTL. Balance ${move.currentHp} HP / ${move.utilityTokens} UTL.`,
  };
}

export async function buyInvite(): Promise<WriteResult> {
  const { data, error } = await supabase.rpc("buy_invite_code");

  if (error) {
    return { error: clean(error.message) };
  }

  const payload = data && typeof data === "object" ? (data as { code?: string; free?: boolean }) : {};
  const code = payload.code ? String(payload.code) : "";

  if (payload.free) {
    return { message: code ? `Minted invite ${code}. No UTL charged.` : "Minted one invite." };
  }

  return {
    message: code
      ? `Bought one invite for ${INVITE_PURCHASE_UTL} UTL. Code ${code}.`
      : `Bought one invite for ${INVITE_PURCHASE_UTL} UTL.`,
  };
}

export async function saveBio(userId: string, bio: string): Promise<WriteResult> {
  const text = bio.trim();

  if (text.length > 500) {
    return { error: "Bio is 500 characters or fewer." };
  }

  const write = await supabase
    .from("profiles")
    .update({ bio: text || null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (write.error) {
    return { error: write.error.message };
  }

  return { message: "Bio saved." };
}

export async function loadBio(userId: string) {
  const { data, error } = await supabase.from("profiles").select("bio").eq("id", userId).maybeSingle();

  if (error) {
    return "";
  }

  return (data?.bio as string | null) ?? "";
}

export async function toggleFollow(userId: string, authorId: string) {
  if (userId === authorId) {
    return false;
  }

  const existing = await supabase
    .from("author_subscriptions")
    .select("author_id")
    .eq("subscriber_id", userId)
    .eq("author_id", authorId)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from("author_subscriptions")
      .delete()
      .eq("subscriber_id", userId)
      .eq("author_id", authorId);
    return false;
  }

  await supabase.from("author_subscriptions").insert({
    subscriber_id: userId,
    author_id: authorId,
  });
  return true;
}

export async function isFollowing(userId: string, authorId: string) {
  const { data } = await supabase
    .from("author_subscriptions")
    .select("author_id")
    .eq("subscriber_id", userId)
    .eq("author_id", authorId)
    .maybeSingle();

  return Boolean(data);
}

export async function loadReactions(
  targetType: "post" | "comment" | "reply",
  targetIds: string[],
  viewerId: string
): Promise<Record<string, ReactionCount[]>> {
  const tallies: Record<string, ReactionCount[]> = {};

  for (const id of targetIds) {
    tallies[id] = emptyReactionCounts();
  }

  if (targetIds.length === 0) {
    return tallies;
  }

  const { data, error } = await supabase
    .from("content_reactions")
    .select("target_id, reaction, user_id")
    .eq("target_type", targetType)
    .in("target_id", targetIds);

  if (error || !data) {
    return tallies;
  }

  for (const row of data) {
    const targetId = row.target_id as string;
    const reaction = row.reaction as string;
    const counts = tallies[targetId];

    if (!counts || !REACTION_KEYS.includes(reaction as ReactionKey)) {
      continue;
    }

    const slot = counts.find((item) => item.key === reaction);

    if (!slot) {
      continue;
    }

    slot.count += 1;

    if (row.user_id === viewerId) {
      slot.mine = true;
    }
  }

  return tallies;
}

export async function toggleReaction(
  userId: string,
  targetType: "post" | "comment" | "reply",
  targetId: string,
  reaction: ReactionKey
): Promise<WriteResult> {
  const existing = await supabase
    .from("content_reactions")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existing.error) {
    return { error: existing.error.message };
  }

  if (existing.data) {
    const removed = await supabase.from("content_reactions").delete().eq("id", existing.data.id);
    return removed.error ? { error: removed.error.message } : {};
  }

  const write = await supabase.from("content_reactions").insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
    reaction,
  });

  return write.error ? { error: write.error.message } : {};
}

export async function signUp(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
  inviteCode: string;
}): Promise<WriteResult> {
  const email = input.email.trim();
  const username = input.username.trim();
  const displayName = input.displayName.trim();
  const inviteCode = input.inviteCode.trim() ? normalizeInviteCode(input.inviteCode) : "";

  if (!email.includes("@")) {
    return { error: "Enter a valid email." };
  }

  if (input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return { error: "Username must be 3–24 letters, numbers, or underscores." };
  }

  if (displayName.length < 2 || displayName.length > 48) {
    return { error: "Display name must be 2–48 characters." };
  }

  if (inviteCode && !isInviteCodeFormat(inviteCode)) {
    return { error: "Invite code must look like LANI-XXXX-XXXX." };
  }

  if (inviteCode) {
    const preview = await supabase.rpc("preview_invite_code", { p_code: inviteCode });
    const row = preview.data && typeof preview.data === "object" ? (preview.data as { ok?: boolean }) : null;

    if (!preview.error && !row?.ok) {
      return { error: "Invite code is invalid or already used." };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username,
        display_name: displayName,
        invite_code: inviteCode || null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await supabase
      .from("profiles")
      .update({ username, display_name: displayName, current_hp: STARTING_HP })
      .eq("id", data.user.id);
  }

  if (data.session) {
    const provisioned = await supabase.rpc("finalize_signup", {
      p_invite_code: inviteCode || null,
    });

    if (provisioned.error && !provisioned.error.message.includes("does not exist")) {
      return { error: clean(provisioned.error.message) };
    }

    return { message: "Account created." };
  }

  return {
    message: inviteCode
      ? "Account created. Confirm your email before signing in. Your invite will apply on first login."
      : "Account created. Confirm your email before signing in.",
  };
}

export async function searchFloor(query: string) {
  const terms = searchTerms(query);

  if (terms.length === 0) {
    return { titles: [], bodies: [], comments: [], desks: [] };
  }

  function matchColumn(
    table: "research_posts" | "research_comments" | "profiles",
    column: string,
    select: string
  ) {
    let request = supabase.from(table).select(select);
    for (const term of terms) {
      request = request.ilike(column, searchPattern(term));
    }
    return request;
  }

  const [titles, bodies, comments, names, users] = await Promise.all([
    matchColumn("research_posts", "title", "id, title, body, sub_topic, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    matchColumn("research_posts", "body", "id, title, body, sub_topic, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    matchColumn("research_comments", "body", "id, post_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    matchColumn("profiles", "display_name", "id, username, display_name, tier, avatar_url")
      .neq("username", "laniakea_treasury")
      .limit(12),
    matchColumn("profiles", "username", "id, username, display_name, tier, avatar_url")
      .neq("username", "laniakea_treasury")
      .limit(12),
  ]);

  const ordered = orderSearchPosts(
    [
      ...new Map(
        [...(titles.data ?? []), ...(bodies.data ?? [])].map((row) => [
          row.id as string,
          {
            id: row.id as string,
            title: row.title as string,
            body: (row.body as string | null) ?? "",
            subTopic: (row.sub_topic as string | null) ?? null,
            createdAt: row.created_at as string,
          },
        ])
      ).values(),
    ],
    query
  );
  const commentRows = [...(comments.data ?? [])]
    .filter((row) => textHasTerms((row.body as string | null) ?? "", query))
    .sort((a, b) => {
      const phrase = query.trim().toLowerCase();
      const aBody = ((a.body as string | null) ?? "").toLowerCase();
      const bBody = ((b.body as string | null) ?? "").toLowerCase();
      const aPhrase = phrase && aBody.includes(phrase) ? 0 : 1;
      const bPhrase = phrase && bBody.includes(phrase) ? 0 : 1;
      if (aPhrase !== bPhrase) {
        return aPhrase - bPhrase;
      }
      return (a.created_at as string) < (b.created_at as string) ? 1 : -1;
    });
  const commentPostIds = [...new Set(commentRows.map((row) => row.post_id as string))];
  const commentPosts = commentPostIds.length
    ? await supabase.from("research_posts").select("id, title").in("id", commentPostIds)
    : { data: [] };
  const commentTitles = new Map(
    (commentPosts.data ?? []).map((row) => [row.id as string, row.title as string])
  );
  const desks = [...new Map([...(names.data ?? []), ...(users.data ?? [])].map((row) => [row.id, row])).values()];

  return {
    titles: ordered.titleHits.map((row) => ({
      id: row.id,
      title: row.title,
      subTopic: row.subTopic,
      excerpt: searchExcerpt(row.body, query, 180, false),
    })),
    bodies: ordered.bodyHits.map((row) => ({
      id: row.id,
      title: row.title,
      subTopic: row.subTopic,
      excerpt: searchExcerpt(row.body, query, 220),
    })),
    comments: commentRows.map((row) => ({
      id: row.id as string,
      postId: row.post_id as string,
      title: commentTitles.get(row.post_id as string) ?? "Note",
      excerpt: searchExcerpt((row.body as string | null) ?? "", query, 200),
    })),
    desks: desks.map((row) => ({
      id: row.id as string,
      username: row.username as string,
      displayName: row.display_name as string,
      tier: row.tier as string,
      avatarUrl: (row.avatar_url as string | null) ?? null,
    })),
  };
}

export async function loadRanking() {
  const withAvatar = await supabase
    .from("profiles")
    .select("id, username, display_name, tier, current_hp, role, avatar_url")
    .neq("username", "laniakea_treasury");
  const { data, error } = withAvatar.error?.message.includes("avatar_url")
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, tier, current_hp, role")
        .neq("username", "laniakea_treasury")
    : withAvatar;

  if (error) {
    throw new Error(error.message);
  }

  return [...(data ?? [])].sort(compareTierThenHp);
}

export async function editPostBody(userId: string, postId: string, body: string): Promise<WriteResult> {
  const text = body.trim();

  if (!text || text.length > 20000) {
    return { error: "Body is required." };
  }

  const now = new Date().toISOString();
  const write = await supabase
    .from("research_posts")
    .update({ body: text, edited_at: now, updated_at: now })
    .eq("id", postId)
    .eq("author_id", userId);

  if (write.error) {
    return { error: write.error.message };
  }

  void requestNoteBrief(postId, true);
  return { message: "Post updated." };
}

export async function editCommentBody(userId: string, commentId: string, body: string): Promise<WriteResult> {
  const text = body.trim();

  if (!text || text.length > COMMENT_BODY_MAX) {
    return { error: "Comment is required." };
  }

  const now = new Date().toISOString();
  const write = await supabase
    .from("research_comments")
    .update({ body: text, edited_at: now, updated_at: now })
    .eq("id", commentId)
    .eq("author_id", userId);

  if (write.error) {
    return { error: write.error.message };
  }

  return { message: "Comment updated." };
}

export async function editReplyBody(userId: string, replyId: string, body: string): Promise<WriteResult> {
  const text = body.trim();

  if (!text || text.length > REPLY_BODY_MAX) {
    return { error: "Reply is required." };
  }

  const now = new Date().toISOString();
  const write = await supabase
    .from("comment_replies")
    .update({ body: text, edited_at: now, updated_at: now })
    .eq("id", replyId)
    .eq("author_id", userId);

  if (write.error) {
    return { error: write.error.message };
  }

  return { message: "Reply updated." };
}

export async function isThreadFollowed(userId: string, postId: string) {
  const { data } = await supabase
    .from("post_subscriptions")
    .select("post_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  return Boolean(data);
}

export async function toggleThreadFollow(userId: string, postId: string) {
  const on = await isThreadFollowed(userId, postId);

  if (on) {
    await supabase.from("post_subscriptions").delete().eq("user_id", userId).eq("post_id", postId);
    return false;
  }

  await supabase.from("post_subscriptions").insert({ user_id: userId, post_id: postId });
  return true;
}

export async function toggleReplyLike(userId: string, replyId: string) {
  const existing = await supabase
    .from("comment_reply_likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("reply_id", replyId)
    .maybeSingle();

  if (existing.data) {
    await supabase.from("comment_reply_likes").delete().eq("user_id", userId).eq("reply_id", replyId);
    return false;
  }

  const { error } = await supabase.from("comment_reply_likes").insert({
    user_id: userId,
    reply_id: replyId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function loadReplyLikes(userId: string, replyIds: string[]) {
  if (replyIds.length === 0) {
    return new Set<string>();
  }

  const { data } = await supabase
    .from("comment_reply_likes")
    .select("reply_id")
    .eq("user_id", userId)
    .in("reply_id", replyIds);

  return new Set((data ?? []).map((row) => row.reply_id as string));
}

export async function saveCommentDraft(input: {
  userId: string;
  postId: string;
  body: string;
  stakeHp: number;
}): Promise<WriteResult> {
  const now = new Date().toISOString();
  const existing = await supabase
    .from("content_drafts")
    .select("id")
    .eq("user_id", input.userId)
    .eq("kind", "comment")
    .eq("post_id", input.postId)
    .maybeSingle();

  const payload = {
    user_id: input.userId,
    kind: "comment",
    post_id: input.postId,
    title: "",
    body: input.body.slice(0, 20000),
    stake_hp: input.stakeHp,
    updated_at: now,
  };

  if (existing.data) {
    const write = await supabase
      .from("content_drafts")
      .update(payload)
      .eq("id", existing.data.id)
      .select("id")
      .maybeSingle();

    if (write.error) {
      return { error: write.error.message };
    }

    return { id: existing.data.id as string, message: "Draft saved." };
  }

  const write = await supabase
    .from("content_drafts")
    .insert({ ...payload, created_at: now })
    .select("id")
    .single();

  if (write.error) {
    return { error: write.error.message };
  }

  return { id: write.data.id, message: "Draft saved." };
}

export async function uploadResearchImage(userId: string, uri: string, mime: string) {
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  const upload = await supabase.storage.from("research-media").upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });

  if (upload.error) {
    return { error: upload.error.message, url: null as string | null };
  }

  const { data } = supabase.storage.from("research-media").getPublicUrl(path);
  return { error: null as string | null, url: data.publicUrl };
}

export async function uploadAvatar(userId: string, uri: string, mime: string): Promise<WriteResult> {
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
  const path = `${userId}/avatar.${ext}`;
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  const upload = await supabase.storage.from("research-media").upload(path, bytes, {
    contentType: mime,
    upsert: true,
  });

  if (upload.error) {
    return { error: upload.error.message };
  }

  const { data } = supabase.storage.from("research-media").getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
  const write = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (write.error) {
    return { error: write.error.message };
  }

  return { message: "Picture saved.", id: publicUrl };
}

export type DeskCard = {
  id: string;
  username: string;
  displayName: string;
  tier: string;
  bio: string;
  avatarUrl: string | null;
  createdAt: string;
  followers: number;
  following: boolean;
  posts: { id: string; title: string; subTopic: string | null; createdAt: string; excerpt: string }[];
  comments: { id: string; postId: string; body: string; createdAt: string }[];
};

export async function loadDesk(username: string, viewerId: string): Promise<DeskCard | null> {
  const profile = await supabase
    .from("profiles")
    .select("id, username, display_name, tier, bio, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle();

  if (profile.error || !profile.data || profile.data.username === "laniakea_treasury") {
    return null;
  }

  const row = profile.data;
  const [posts, comments, followers, followed] = await Promise.all([
    supabase
      .from("research_posts")
      .select("id, title, body, sub_topic, created_at")
      .eq("author_id", row.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("research_comments")
      .select("id, post_id, body, created_at")
      .eq("author_id", row.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("author_subscriptions")
      .select("subscriber_id", { count: "exact", head: true })
      .eq("author_id", row.id),
    supabase
      .from("author_subscriptions")
      .select("author_id")
      .eq("subscriber_id", viewerId)
      .eq("author_id", row.id)
      .maybeSingle(),
  ]);

  return {
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    tier: row.tier as string,
    bio: (row.bio as string | null) ?? "",
    avatarUrl: (row.avatar_url as string | null) ?? null,
    createdAt: row.created_at as string,
    followers: followers.count ?? 0,
    following: Boolean(followed.data),
    posts: (posts.data ?? []).map((post) => ({
      id: post.id as string,
      title: post.title as string,
      subTopic: (post.sub_topic as string | null) ?? null,
      createdAt: post.created_at as string,
      excerpt: researchExcerpt((post.body as string | null) ?? "", 180),
    })),
    comments: (comments.data ?? []).map((comment) => ({
      id: comment.id as string,
      postId: comment.post_id as string,
      body: comment.body as string,
      createdAt: comment.created_at as string,
    })),
  };
}

export async function loadTopicRanks() {
  const { data, error } = await supabase
    .from("subtopic_ranks")
    .select("user_id, sub_topic, tier, current_hp");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function loadInvitees(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, tier")
    .eq("invited_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    tier: row.tier as string,
  }));
}

export async function loadReferralLines(userId: string) {
  const { data, error } = await supabase
    .from("revenue_distributions")
    .select("id, amount, depth, created_at")
    .eq("beneficiary_id", userId)
    .eq("kind", "referral_keep")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    amount: row.amount as number,
    depth: row.depth as number,
    createdAt: row.created_at as string,
  }));
}

export { DEFAULT_UNLOCK_RATE_MULTIPLE, REACTION_KEYS };
