import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CommentReply,
  type CommentReplyView,
  type CommentThreadItem,
  type ResearchComment,
  type ResearchPostAuthor,
} from "@/types";

export function isMissingCommentsSchema(message: string) {
  return (
    message.includes("research_comments") ||
    message.includes("comment_votes") ||
    message.includes("comment_replies") ||
    message.includes("comment_reply_likes")
  );
}

function authorsById(rows: ResearchPostAuthor[] | null) {
  const map = new Map<string, ResearchPostAuthor>();

  for (const author of rows ?? []) {
    map.set(author.id, author);
  }

  return map;
}

export async function getCommentCounts(
  supabase: SupabaseClient,
  postIds: string[]
): Promise<Record<string, number>> {
  if (postIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("research_comments")
    .select("post_id")
    .in("post_id", postIds);

  if (error) {
    return {};
  }

  const counts: Record<string, number> = {};

  for (const row of data ?? []) {
    counts[row.post_id] = (counts[row.post_id] ?? 0) + 1;
  }

  return counts;
}

export async function getCommentThread(
  supabase: SupabaseClient,
  postId: string,
  viewerId: string
): Promise<{
  comments: CommentThreadItem[];
  error: string | null;
  missingTable: boolean;
}> {
  const { data: commentRows, error: commentError } = await supabase
    .from("research_comments")
    .select(
      "id, post_id, author_id, body, status, current_health, original_stake, created_at, updated_at"
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (commentError) {
    return {
      comments: [],
      error: commentError.message,
      missingTable: isMissingCommentsSchema(commentError.message),
    };
  }

  const comments = (commentRows ?? []) as ResearchComment[];

  if (comments.length === 0) {
    return { comments: [], error: null, missingTable: false };
  }

  const commentIds = comments.map((comment) => comment.id);
  const { data: replyRows, error: replyError } = await supabase
    .from("comment_replies")
    .select("id, comment_id, author_id, body, created_at")
    .in("comment_id", commentIds)
    .order("created_at", { ascending: true });

  if (replyError) {
    return {
      comments: [],
      error: replyError.message,
      missingTable: isMissingCommentsSchema(replyError.message),
    };
  }

  const replies = (replyRows ?? []) as CommentReply[];
  const replyIds = replies.map((reply) => reply.id);
  const likeRows =
    replyIds.length === 0
      ? { data: [] as Array<{ reply_id: string; user_id: string }>, error: null }
      : await supabase
          .from("comment_reply_likes")
          .select("reply_id, user_id")
          .in("reply_id", replyIds);

  if (likeRows.error) {
    return {
      comments: [],
      error: likeRows.error.message,
      missingTable: isMissingCommentsSchema(likeRows.error.message),
    };
  }

  const likeCount = new Map<string, number>();
  const likedByViewer = new Set<string>();

  for (const like of likeRows.data ?? []) {
    likeCount.set(like.reply_id, (likeCount.get(like.reply_id) ?? 0) + 1);

    if (like.user_id === viewerId) {
      likedByViewer.add(like.reply_id);
    }
  }

  const authorIds = [
    ...new Set([
      ...comments.map((comment) => comment.author_id),
      ...replies.map((reply) => reply.author_id),
    ]),
  ];
  const authorsWithAvatar = await supabase
    .from("profiles")
    .select("id, username, display_name, tier, avatar_url")
    .in("id", authorIds);
  const { data: authors } =
    authorsWithAvatar.error &&
    authorsWithAvatar.error.message.includes("avatar_url")
      ? await supabase
          .from("profiles")
          .select("id, username, display_name, tier")
          .in("id", authorIds)
      : authorsWithAvatar;
  const authorsMap = authorsById(authors as ResearchPostAuthor[] | null);

  const repliesByComment = new Map<string, CommentReplyView[]>();

  for (const reply of replies) {
    const view: CommentReplyView = {
      ...reply,
      author: authorsMap.get(reply.author_id) ?? null,
      likeCount: likeCount.get(reply.id) ?? 0,
      likedByViewer: likedByViewer.has(reply.id),
    };
    const list = repliesByComment.get(reply.comment_id) ?? [];
    list.push(view);
    repliesByComment.set(reply.comment_id, list);
  }

  return {
    comments: comments.map((comment) => ({
      ...comment,
      author: authorsMap.get(comment.author_id) ?? null,
      replies: repliesByComment.get(comment.id) ?? [],
    })),
    error: null,
    missingTable: false,
  };
}

export async function getViewerCommentVotes(
  supabase: SupabaseClient,
  userId: string,
  commentIds: string[]
): Promise<Record<string, number>> {
  if (commentIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("comment_votes")
    .select("comment_id, value")
    .eq("user_id", userId)
    .in("comment_id", commentIds);

  if (error) {
    return {};
  }

  const votes: Record<string, number> = {};

  for (const row of data ?? []) {
    votes[row.comment_id] = row.value;
  }

  return votes;
}
