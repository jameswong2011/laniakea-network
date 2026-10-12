import {
  HP_TRANSACTION_ASCENT,
  HP_TRANSACTION_BUY,
  HP_TRANSACTION_CALIBRATION,
  HP_TRANSACTION_CASHOUT,
  HP_TRANSACTION_DRAIN,
  HP_TRANSACTION_HUNT,
  HP_TRANSACTION_REFUND,
  HP_TRANSACTION_STAKE,
  HP_TRANSACTION_VOTE,
} from "../../../src/types";
import { supabase } from "./supabase";

export type InboxItem = {
  id: string;
  kind: string;
  postId: string | null;
  readAt: string | null;
  createdAt: string;
  copy: string;
};

export type DraftItem = {
  id: string;
  kind: "post" | "comment";
  postId: string | null;
  title: string;
  body: string;
  subTopic: string | null;
  updatedAt: string;
};

export type SavedItem = {
  id: string;
  title: string;
  subTopic: string | null;
  createdAt: string;
};

export type WalletEntry = {
  id: string;
  type: string;
  signedAmount: number;
  description: string | null;
  createdAt: string;
  postId: string | null;
  postTitle: string | null;
};

export type InviteCode = {
  id: string;
  code: string;
  status: string;
};

export type AccountNote = {
  id: string;
  title: string;
  status: string;
  subTopic: string | null;
  createdAt: string;
};

function signedAmount(type: string, amount: number) {
  if (
    type === HP_TRANSACTION_STAKE ||
    type === HP_TRANSACTION_VOTE ||
    type === HP_TRANSACTION_DRAIN ||
    type === HP_TRANSACTION_CASHOUT
  ) {
    return -Math.abs(amount);
  }

  if (
    type === HP_TRANSACTION_BUY ||
    type === HP_TRANSACTION_HUNT ||
    type === HP_TRANSACTION_ASCENT ||
    type === HP_TRANSACTION_REFUND
  ) {
    return Math.abs(amount);
  }

  if (type === HP_TRANSACTION_CALIBRATION) {
    return amount;
  }

  return amount;
}

function inboxCopy(kind: string, actor: string, title: string) {
  if (kind === "reply_to_comment") {
    return `${actor} replied to your comment on ${title}`;
  }

  if (kind === "author_post") {
    return `${actor} published ${title}`;
  }

  return `${actor} commented on ${title}`;
}

export async function loadInbox(userId: string): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, post_id, read_at, created_at, actor_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter(Boolean))] as string[];
  const postIds = [...new Set(rows.map((row) => row.post_id).filter(Boolean))] as string[];
  const actors = new Map<string, string>();
  const titles = new Map<string, string>();

  if (actorIds.length > 0) {
    const profiles = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", actorIds);

    for (const profile of profiles.data ?? []) {
      actors.set(profile.id, profile.display_name || profile.username);
    }
  }

  if (postIds.length > 0) {
    const posts = await supabase.from("research_posts").select("id, title").in("id", postIds);

    for (const post of posts.data ?? []) {
      titles.set(post.id, post.title);
    }
  }

  return rows.map((row) => ({
    id: row.id as string,
    kind: row.kind as string,
    postId: (row.post_id as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: row.created_at as string,
    copy: inboxCopy(
      row.kind as string,
      row.actor_id ? (actors.get(row.actor_id as string) ?? "Someone") : "Someone",
      row.post_id ? (titles.get(row.post_id as string) ?? "a note") : "a note"
    ),
  }));
}

export async function markInboxRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadDrafts(userId: string): Promise<DraftItem[]> {
  const { data, error } = await supabase
    .from("content_drafts")
    .select("id, kind, post_id, title, body, sub_topic, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.kind === "comment" ? "comment" : "post",
    postId: (row.post_id as string | null) ?? null,
    title: (row.title as string | null) ?? "",
    body: (row.body as string | null) ?? "",
    subTopic: (row.sub_topic as string | null) ?? null,
    updatedAt: row.updated_at as string,
  }));
}

export async function deleteDraft(userId: string, draftId: string) {
  const { error } = await supabase
    .from("content_drafts")
    .delete()
    .eq("user_id", userId)
    .eq("id", draftId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadSaved(userId: string): Promise<SavedItem[]> {
  const saved = await supabase
    .from("saved_posts")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (saved.error) {
    throw new Error(saved.error.message);
  }

  const ids = (saved.data ?? []).map((row) => row.post_id as string);

  if (ids.length === 0) {
    return [];
  }

  const posts = await supabase
    .from("research_posts")
    .select("id, title, sub_topic, created_at")
    .in("id", ids);

  if (posts.error) {
    throw new Error(posts.error.message);
  }

  const byId = new Map((posts.data ?? []).map((post) => [post.id as string, post]));

  return ids.flatMap((id) => {
    const post = byId.get(id);

    if (!post) {
      return [];
    }

    return [
      {
        id,
        title: post.title as string,
        subTopic: (post.sub_topic as string | null) ?? null,
        createdAt: post.created_at as string,
      },
    ];
  });
}

export async function isPostSaved(userId: string, postId: string) {
  const { data, error } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data);
}

export async function toggleSaved(userId: string, postId: string) {
  const saved = await isPostSaved(userId, postId);

  if (saved) {
    const { error } = await supabase
      .from("saved_posts")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);

    if (error) {
      throw new Error(error.message);
    }

    return false;
  }

  const { error } = await supabase.from("saved_posts").insert({
    user_id: userId,
    post_id: postId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

const WALLET_LIMIT = 200;

export async function loadWallet(userId: string): Promise<WalletEntry[]> {
  const withPost = await supabase
    .from("hp_transactions")
    .select("id, amount, type, description, post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(WALLET_LIMIT);

  const legacy =
    withPost.error && withPost.error.message.includes("post_id")
      ? await supabase
          .from("hp_transactions")
          .select("id, amount, type, description, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(WALLET_LIMIT)
      : null;

  const result = legacy ?? withPost;

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []) as Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    post_id?: string | null;
    created_at: string;
  }>;
  const postIds = [...new Set(rows.map((row) => row.post_id).filter(Boolean))] as string[];
  const titles = new Map<string, string>();

  if (postIds.length > 0) {
    const posts = await supabase.from("research_posts").select("id, title").in("id", postIds);

    for (const post of posts.data ?? []) {
      titles.set(post.id, post.title);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    signedAmount: signedAmount(row.type, row.amount),
    description: row.description,
    createdAt: row.created_at,
    postId: row.post_id ?? null,
    postTitle: row.post_id ? (titles.get(row.post_id) ?? null) : null,
  }));
}

export async function loadInvites(userId: string): Promise<InviteCode[]> {
  const { data, error } = await supabase
    .from("invite_codes")
    .select("id, code, status")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    code: row.code as string,
    status: row.status as string,
  }));
}

export async function loadAccountNotes(userId: string): Promise<AccountNote[]> {
  const { data, error } = await supabase
    .from("research_posts")
    .select("id, title, status, sub_topic, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    status: row.status as string,
    subTopic: (row.sub_topic as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
