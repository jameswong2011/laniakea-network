import type { SupabaseClient } from "@supabase/supabase-js";
import { researchCommentPath, researchPostPath } from "@/lib/research/feed";

export const REACTION_KEYS = [
  "agree",
  "disagree",
  "detailed",
  "non_consensus",
  "informative",
] as const;

export type ReactionKey = (typeof REACTION_KEYS)[number];
export type ReactionTarget = "post" | "comment" | "reply";

export const REACTION_LABELS: Record<ReactionKey, string> = {
  agree: "Agree",
  disagree: "Disagree",
  detailed: "Detailed",
  non_consensus: "Non-consensus",
  informative: "Informative",
};

export type ReactionCount = {
  key: ReactionKey;
  count: number;
  mine: boolean;
};

export type NotificationRow = {
  id: string;
  kind: "comment_on_post" | "reply_to_comment" | "author_post";
  post_id: string | null;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
  actor_name: string | null;
  actor_username: string | null;
  post_title: string | null;
};

export const BIO_MAX = 500;

export type ContentDraft = {
  id: string;
  kind: "post" | "comment";
  post_id: string | null;
  title: string;
  body: string;
  sub_topic: string | null;
  stake_hp: number | null;
  unlock_rate_multiple: number | null;
  created_at: string;
  updated_at: string;
};

export function isMissingForumSchema(message: string) {
  return (
    (message.includes("content_reactions") ||
      message.includes("saved_posts") ||
      message.includes("post_subscriptions") ||
      message.includes("notifications") ||
      message.includes("research-media") ||
      message.includes("author_subscriptions") ||
      message.includes("content_drafts") ||
      message.includes("profiles.bio") ||
      message.includes("column bio")) &&
    (message.includes("does not exist") ||
      message.includes("42P01") ||
      message.includes("42703") ||
      message.includes("schema cache"))
  );
}

export function profilePath(username: string) {
  return `/u/${encodeURIComponent(username)}`;
}

export function isReactionKey(value: string): value is ReactionKey {
  return (REACTION_KEYS as readonly string[]).includes(value);
}

function emptyCounts(): ReactionCount[] {
  return REACTION_KEYS.map((key) => ({ key, count: 0, mine: false }));
}

export function tallyReactions(
  rows: { reaction: string; user_id: string }[],
  viewerId: string
): ReactionCount[] {
  const counts = emptyCounts();
  const index = new Map(counts.map((row, i) => [row.key, i]));

  for (const row of rows) {
    if (!isReactionKey(row.reaction)) {
      continue;
    }

    const i = index.get(row.reaction);

    if (i == null) {
      continue;
    }

    counts[i].count += 1;

    if (row.user_id === viewerId) {
      counts[i].mine = true;
    }
  }

  return counts;
}

export async function loadReactions(
  supabase: SupabaseClient,
  targetType: ReactionTarget,
  targetIds: string[],
  viewerId: string
): Promise<Record<string, ReactionCount[]>> {
  const empty: Record<string, ReactionCount[]> = {};

  for (const id of targetIds) {
    empty[id] = emptyCounts();
  }

  if (targetIds.length === 0) {
    return empty;
  }

  const { data, error } = await supabase
    .from("content_reactions")
    .select("target_id, reaction, user_id")
    .eq("target_type", targetType)
    .in("target_id", targetIds);

  if (error) {
    return empty;
  }

  const byTarget = new Map<string, { reaction: string; user_id: string }[]>();

  for (const row of data ?? []) {
    const list = byTarget.get(row.target_id) ?? [];
    list.push({ reaction: row.reaction, user_id: row.user_id });
    byTarget.set(row.target_id, list);
  }

  for (const id of targetIds) {
    empty[id] = tallyReactions(byTarget.get(id) ?? [], viewerId);
  }

  return empty;
}

export async function loadSavedPostIds(
  supabase: SupabaseClient,
  userId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (postIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) {
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.post_id as string));
}

export async function isPostSubscribed(
  supabase: SupabaseClient,
  userId: string,
  postId: string
) {
  const { data, error } = await supabase
    .from("post_subscriptions")
    .select("post_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function subscribeToPost(
  supabase: SupabaseClient,
  userId: string,
  postId: string
) {
  const { error } = await supabase
    .from("post_subscriptions")
    .upsert({ user_id: userId, post_id: postId }, { onConflict: "user_id,post_id" });

  return error && !isMissingForumSchema(error.message) ? error.message : null;
}

export async function notifyCommentOnPost(
  supabase: SupabaseClient,
  input: {
    actorId: string;
    postId: string;
    commentId: string;
    postAuthorId: string;
  }
) {
  const recipients = new Set<string>();

  if (input.postAuthorId !== input.actorId) {
    recipients.add(input.postAuthorId);
  }

  const subs = await supabase
    .from("post_subscriptions")
    .select("user_id")
    .eq("post_id", input.postId);

  if (!subs.error) {
    for (const row of subs.data ?? []) {
      if (row.user_id !== input.actorId) {
        recipients.add(row.user_id as string);
      }
    }
  }

  if (recipients.size === 0) {
    return;
  }

  await supabase.from("notifications").insert(
    [...recipients].map((userId) => ({
      user_id: userId,
      actor_id: input.actorId,
      kind: "comment_on_post",
      post_id: input.postId,
      comment_id: input.commentId,
    }))
  );

  await subscribeToPost(supabase, input.actorId, input.postId);
}

export async function notifyReplyToComment(
  supabase: SupabaseClient,
  input: {
    actorId: string;
    postId: string;
    commentId: string;
    commentAuthorId: string;
  }
) {
  if (input.commentAuthorId !== input.actorId) {
    await supabase.from("notifications").insert({
      user_id: input.commentAuthorId,
      actor_id: input.actorId,
      kind: "reply_to_comment",
      post_id: input.postId,
      comment_id: input.commentId,
    });
  }

  await subscribeToPost(supabase, input.actorId, input.postId);
}

export async function loadNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<{ items: NotificationRow[]; unread: number }> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, post_id, comment_id, read_at, created_at, actor_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return { items: [], unread: 0 };
  }

  const rows = data ?? [];
  const actorIds = [
    ...new Set(
      rows
        .map((row) => row.actor_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const postIds = [
    ...new Set(
      rows
        .map((row) => row.post_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const actors = new Map<string, { display_name: string; username: string }>();
  const titles = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", actorIds);

    for (const profile of profiles ?? []) {
      actors.set(profile.id, {
        display_name: profile.display_name,
        username: profile.username,
      });
    }
  }

  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from("research_posts")
      .select("id, title")
      .in("id", postIds);

    for (const post of posts ?? []) {
      titles.set(post.id, post.title);
    }
  }

  return {
    unread: rows.filter((row) => !row.read_at).length,
    items: rows.map((row) => {
      const actor = row.actor_id ? actors.get(row.actor_id as string) : null;

      return {
        id: row.id as string,
        kind: row.kind as NotificationRow["kind"],
        post_id: (row.post_id as string | null) ?? null,
        comment_id: (row.comment_id as string | null) ?? null,
        read_at: (row.read_at as string | null) ?? null,
        created_at: row.created_at as string,
        actor_name: actor?.display_name ?? null,
        actor_username: actor?.username ?? null,
        post_title: row.post_id ? titles.get(row.post_id as string) ?? null : null,
      };
    }),
  };
}

export function notificationHref(item: NotificationRow) {
  if (!item.post_id) {
    return "/feed";
  }

  if (item.comment_id) {
    return researchCommentPath(item.post_id, item.comment_id);
  }

  return researchPostPath(item.post_id);
}

export function notificationCopy(item: NotificationRow) {
  const actor = item.actor_name ?? "Someone";
  const title = item.post_title ?? "a note";

  if (item.kind === "reply_to_comment") {
    return `${actor} replied to your comment on ${title}`;
  }

  if (item.kind === "author_post") {
    return `${actor} published ${title}`;
  }

  return `${actor} commented on ${title}`;
}

export async function isAuthorFollowed(
  supabase: SupabaseClient,
  subscriberId: string,
  authorId: string
) {
  const { data, error } = await supabase
    .from("author_subscriptions")
    .select("author_id")
    .eq("subscriber_id", subscriberId)
    .eq("author_id", authorId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function countAuthorFollowers(
  supabase: SupabaseClient,
  authorId: string
) {
  const { count, error } = await supabase
    .from("author_subscriptions")
    .select("author_id", { count: "exact", head: true })
    .eq("author_id", authorId);

  return error ? 0 : (count ?? 0);
}

export async function notifyAuthorFollowers(
  supabase: SupabaseClient,
  input: { actorId: string; postId: string }
) {
  const subs = await supabase
    .from("author_subscriptions")
    .select("subscriber_id")
    .eq("author_id", input.actorId);

  if (subs.error || !subs.data?.length) {
    return;
  }

  await supabase.from("notifications").insert(
    subs.data.map((row) => ({
      user_id: row.subscriber_id as string,
      actor_id: input.actorId,
      kind: "author_post",
      post_id: input.postId,
    }))
  );
}

export async function loadPostDrafts(
  supabase: SupabaseClient,
  userId: string
): Promise<ContentDraft[]> {
  const { data, error } = await supabase
    .from("content_drafts")
    .select(
      "id, kind, post_id, title, body, sub_topic, stake_hp, unlock_rate_multiple, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("kind", "post")
    .order("updated_at", { ascending: false });

  return error ? [] : ((data ?? []) as ContentDraft[]);
}

export async function loadCommentDraft(
  supabase: SupabaseClient,
  userId: string,
  postId: string
): Promise<ContentDraft | null> {
  const { data, error } = await supabase
    .from("content_drafts")
    .select(
      "id, kind, post_id, title, body, sub_topic, stake_hp, unlock_rate_multiple, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("kind", "comment")
    .eq("post_id", postId)
    .maybeSingle();

  return error || !data ? null : (data as ContentDraft);
}

export async function loadDraftById(
  supabase: SupabaseClient,
  userId: string,
  draftId: string
): Promise<ContentDraft | null> {
  const { data, error } = await supabase
    .from("content_drafts")
    .select(
      "id, kind, post_id, title, body, sub_topic, stake_hp, unlock_rate_multiple, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("id", draftId)
    .maybeSingle();

  return error || !data ? null : (data as ContentDraft);
}

export function searchPattern(query: string) {
  return `%${query.trim().replace(/[%_]/g, "").slice(0, 80)}%`;
}
