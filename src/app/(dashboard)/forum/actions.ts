"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { researchPostPath } from "@/lib/research/feed";
import {
  BIO_MAX,
  REACTION_KEYS,
  isMissingForumSchema,
  type ReactionTarget,
} from "@/lib/research/forum";

export type ForumActionState = {
  error?: string;
  message?: string;
  id?: string;
  stamp?: number;
};

function refreshSocial(postId?: string) {
  if (postId) {
    revalidatePath(researchPostPath(postId));
  }

  revalidatePath("/feed");
  revalidatePath("/dashboard");
  revalidatePath("/saved");
  revalidatePath("/drafts");
  revalidatePath("/search");
}

export async function toggleReaction(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      targetType: z.enum(["post", "comment", "reply"]),
      targetId: z.string().uuid(),
      reaction: z.enum(REACTION_KEYS),
      postId: z.string().uuid().optional(),
    })
    .safeParse({
      targetType: formData.get("targetType"),
      targetId: formData.get("targetId"),
      reaction: formData.get("reaction"),
      postId: formData.get("postId") || undefined,
    });

  if (!parsed.success) {
    return;
  }

  const { targetType, targetId, reaction, postId } = parsed.data;
  const existing = await supabase
    .from("content_reactions")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", targetType as ReactionTarget)
    .eq("target_id", targetId)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existing.data) {
    await supabase.from("content_reactions").delete().eq("id", existing.data.id);
  } else if (!existing.error || isMissingForumSchema(existing.error.message)) {
    const write = await supabase.from("content_reactions").insert({
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      reaction,
    });

    if (write.error && !isMissingForumSchema(write.error.message)) {
      return;
    }
  }

  refreshSocial(postId);
}

export async function toggleSavedPost(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      postId: z.string().uuid(),
    })
    .safeParse({ postId: formData.get("postId") });

  if (!parsed.success) {
    return;
  }

  const { postId } = parsed.data;
  const existing = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from("saved_posts")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
  } else {
    await supabase.from("saved_posts").insert({
      user_id: userId,
      post_id: postId,
    });
  }

  refreshSocial(postId);
}

export async function togglePostSubscription(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      postId: z.string().uuid(),
    })
    .safeParse({ postId: formData.get("postId") });

  if (!parsed.success) {
    return;
  }

  const { postId } = parsed.data;
  const existing = await supabase
    .from("post_subscriptions")
    .select("post_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from("post_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
  } else {
    await supabase.from("post_subscriptions").insert({
      user_id: userId,
      post_id: postId,
    });
  }

  refreshSocial(postId);
}

export async function markNotificationsRead() {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  revalidatePath("/feed");
  revalidatePath("/dashboard");
}

export async function editPostBody(
  _prev: ForumActionState,
  formData: FormData
): Promise<ForumActionState> {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      postId: z.string().uuid(),
      body: z.string().trim().min(1).max(20000),
    })
    .safeParse({
      postId: formData.get("postId"),
      body: formData.get("body"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, stamp: Date.now() };
  }

  const now = new Date().toISOString();
  const write = await supabase
    .from("research_posts")
    .update({ body: parsed.data.body, edited_at: now, updated_at: now })
    .eq("id", parsed.data.postId)
    .eq("author_id", userId);

  if (write.error) {
    return { error: write.error.message, stamp: Date.now() };
  }

  refreshSocial(parsed.data.postId);
  return { message: "Post updated.", stamp: Date.now() };
}

export async function editCommentBody(
  _prev: ForumActionState,
  formData: FormData
): Promise<ForumActionState> {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      postId: z.string().uuid(),
      commentId: z.string().uuid(),
      body: z.string().trim().min(1).max(8000),
    })
    .safeParse({
      postId: formData.get("postId"),
      commentId: formData.get("commentId"),
      body: formData.get("body"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, stamp: Date.now() };
  }

  const now = new Date().toISOString();
  const write = await supabase
    .from("research_comments")
    .update({ body: parsed.data.body, edited_at: now, updated_at: now })
    .eq("id", parsed.data.commentId)
    .eq("author_id", userId);

  if (write.error) {
    return { error: write.error.message, stamp: Date.now() };
  }

  refreshSocial(parsed.data.postId);
  return { message: "Comment updated.", stamp: Date.now() };
}

export async function editReplyBody(
  _prev: ForumActionState,
  formData: FormData
): Promise<ForumActionState> {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      postId: z.string().uuid(),
      replyId: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
    })
    .safeParse({
      postId: formData.get("postId"),
      replyId: formData.get("replyId"),
      body: formData.get("body"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, stamp: Date.now() };
  }

  const now = new Date().toISOString();
  const write = await supabase
    .from("comment_replies")
    .update({ body: parsed.data.body, edited_at: now, updated_at: now })
    .eq("id", parsed.data.replyId)
    .eq("author_id", userId);

  if (write.error) {
    return { error: write.error.message, stamp: Date.now() };
  }

  refreshSocial(parsed.data.postId);
  return { message: "Reply updated.", stamp: Date.now() };
}

export async function toggleAuthorFollow(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      authorId: z.string().uuid(),
    })
    .safeParse({ authorId: formData.get("authorId") });

  if (!parsed.success || parsed.data.authorId === userId) {
    return;
  }

  const { authorId } = parsed.data;
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
  } else {
    await supabase.from("author_subscriptions").insert({
      subscriber_id: userId,
      author_id: authorId,
    });
  }

  revalidatePath("/feed");
  revalidatePath("/dashboard");
  revalidatePath("/u", "layout");
}

export async function updateBio(
  _prev: ForumActionState,
  formData: FormData
): Promise<ForumActionState> {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      bio: z.string().trim().max(BIO_MAX),
    })
    .safeParse({ bio: formData.get("bio") ?? "" });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, stamp: Date.now() };
  }

  const write = await supabase
    .from("profiles")
    .update({
      bio: parsed.data.bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (write.error) {
    return {
      error: isMissingForumSchema(write.error.message)
        ? "Bio needs the discovery SQL. Run supabase/migrations/20260818170000_forum_discovery.sql."
        : write.error.message,
      stamp: Date.now(),
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/u", "layout");
  return { message: "Bio saved.", stamp: Date.now() };
}

export async function updateAvatar(url: string): Promise<ForumActionState> {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .string()
    .trim()
    .url("Invalid picture URL.")
    .max(800)
    .safeParse(url);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, stamp: Date.now() };
  }

  if (!parsed.data.includes(userId) || !parsed.data.includes("research-media")) {
    return { error: "Picture must be uploaded to your desk folder.", stamp: Date.now() };
  }

  const write = await supabase
    .from("profiles")
    .update({
      avatar_url: parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (write.error) {
    return {
      error: write.error.message.includes("avatar_url")
        ? "Profile pictures need a one-time SQL update. Run supabase/migrations/20260818180000_profile_avatars.sql."
        : write.error.message,
      stamp: Date.now(),
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/ranking");
  revalidatePath("/u", "layout");
  revalidatePath("/feed");
  return { message: "Picture saved.", stamp: Date.now() };
}

export async function saveDraft(
  _prev: ForumActionState,
  formData: FormData
): Promise<ForumActionState> {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({
      draftId: z.string().uuid().optional(),
      kind: z.enum(["post", "comment"]),
      postId: z.string().uuid().optional(),
      title: z.string().max(200).optional(),
      body: z.string().max(20000).optional(),
      subTopic: z.string().optional(),
      stakeHp: z.coerce.number().int().min(1).max(100).optional(),
      unlockRateMultiple: z.coerce.number().int().min(1).max(5).optional(),
    })
    .safeParse({
      draftId: formData.get("draftId") || undefined,
      kind: formData.get("kind"),
      postId: formData.get("postId") || undefined,
      title: formData.get("title") ?? "",
      body: formData.get("body") ?? "",
      subTopic: formData.get("subTopic") || undefined,
      stakeHp: formData.get("stakeHp") || undefined,
      unlockRateMultiple: formData.get("unlockRateMultiple") || undefined,
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, stamp: Date.now() };
  }

  if (parsed.data.kind === "comment" && !parsed.data.postId) {
    return { error: "Comment drafts need a post.", stamp: Date.now() };
  }

  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    kind: parsed.data.kind,
    post_id: parsed.data.postId ?? null,
    title: parsed.data.title ?? "",
    body: parsed.data.body ?? "",
    sub_topic: parsed.data.subTopic ?? null,
    stake_hp: parsed.data.stakeHp ?? null,
    unlock_rate_multiple: parsed.data.unlockRateMultiple ?? null,
    updated_at: now,
  };

  if (parsed.data.draftId) {
    const write = await supabase
      .from("content_drafts")
      .update(payload)
      .eq("id", parsed.data.draftId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (write.error) {
      return {
        error: isMissingForumSchema(write.error.message)
          ? "Drafts need the discovery SQL."
          : write.error.message,
        stamp: Date.now(),
      };
    }

    revalidatePath("/drafts");
    return {
      message: "Draft saved.",
      id: write.data?.id ?? parsed.data.draftId,
      stamp: Date.now(),
    };
  }

  if (parsed.data.kind === "comment" && parsed.data.postId) {
    const existing = await supabase
      .from("content_drafts")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "comment")
      .eq("post_id", parsed.data.postId)
      .maybeSingle();

    if (existing.data) {
      const write = await supabase
        .from("content_drafts")
        .update(payload)
        .eq("id", existing.data.id)
        .select("id")
        .maybeSingle();

      revalidatePath("/drafts");
      return {
        message: "Draft saved.",
        id: write.data?.id ?? existing.data.id,
        stamp: Date.now(),
      };
    }
  }

  const write = await supabase
    .from("content_drafts")
    .insert({ ...payload, created_at: now })
    .select("id")
    .single();

  if (write.error) {
    return {
      error: isMissingForumSchema(write.error.message)
        ? "Drafts need the discovery SQL."
        : write.error.message,
      stamp: Date.now(),
    };
  }

  revalidatePath("/drafts");
  return { message: "Draft saved.", id: write.data.id, stamp: Date.now() };
}

export async function deleteDraft(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const parsed = z
    .object({ draftId: z.string().uuid() })
    .safeParse({ draftId: formData.get("draftId") });

  if (!parsed.success) {
    return;
  }

  await supabase
    .from("content_drafts")
    .delete()
    .eq("id", parsed.data.draftId)
    .eq("user_id", userId);

  revalidatePath("/drafts");
  revalidatePath("/feed/new");
}
