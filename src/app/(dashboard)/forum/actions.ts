"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { researchPostPath } from "@/lib/research/feed";
import {
  REACTION_KEYS,
  isMissingForumSchema,
  type ReactionTarget,
} from "@/lib/research/forum";

export type ForumActionState = {
  error?: string;
  message?: string;
  stamp?: number;
};

function refreshSocial(postId?: string) {
  if (postId) {
    revalidatePath(researchPostPath(postId));
  }

  revalidatePath("/feed");
  revalidatePath("/dashboard");
  revalidatePath("/saved");
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
