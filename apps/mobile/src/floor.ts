import {
  RESEARCH_POST_STATUS_ARCHIVED,
  RESEARCH_POST_STATUS_ASCENDED,
  RESEARCH_POST_STATUS_LIVE,
  canOpenDesk,
  getDeskAccess,
  getPostHealthLabel,
  getPostHealthPercent,
  getPostHealthState,
  postedInWindow,
  postedSince,
  quoteDeskUnlock,
  researchExcerpt,
  resolveTier,
  resolveUnlockRateMultiple,
  withPaidUnlock,
  type DeskAccess,
  type Tier,
  type UnlockQuote,
} from "./domain";
import { DEFAULT_FEED_STATUSES, type FeedQuery } from "./feed-query";
import { supabase } from "./supabase";

const POST_COLUMNS =
  "id, author_id, title, body, status, current_health, original_stake, sub_topic, unlock_rate_multiple, created_at, updated_at";

const POST_COLUMNS_AI = `${POST_COLUMNS}, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks`;

export type DeskProfile = {
  id: string;
  username: string;
  display_name: string;
  tier: string;
  role: string;
  current_hp: number;
  utility_tokens: number;
  avatar_url: string | null;
};

export type FloorNote = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  status: string;
  currentHealth: number;
  originalStake: number;
  subTopic: string;
  createdAt: string;
  authorName: string;
  authorUsername: string;
  authorTier: Tier | null;
  authorAvatar: string | null;
  access: DeskAccess;
  unlockQuote: UnlockQuote | null;
  healthLabel: string;
  healthPercent: number;
  summary: string | null;
  ticker: string | null;
  conviction: string | null;
  claims: string[];
  risks: string[];
};

export type FloorReply = {
  id: string;
  authorId: string;
  body: string;
  authorName: string;
  authorAvatar: string | null;
};

export type FloorComment = {
  id: string;
  authorId: string;
  body: string;
  authorName: string;
  authorAvatar: string | null;
  currentHealth: number;
  originalStake: number;
  status: string;
  healthLabel: string;
  healthPercent: number;
  replies: FloorReply[];
};

type PostRow = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  status: string;
  current_health: number;
  original_stake: number | null;
  sub_topic: string | null;
  unlock_rate_multiple: number | null;
  created_at: string;
  ai_summary?: string | null;
  ai_ticker?: string | null;
  ai_conviction?: string | null;
  ai_claims?: unknown;
  ai_risks?: unknown;
};

type AuthorRow = {
  id: string;
  username: string;
  display_name: string;
  tier: string;
  avatar_url?: string | null;
};

function healthLabel(status: string, health: number, stake: number) {
  if (status === RESEARCH_POST_STATUS_ASCENDED) {
    return "Ascended";
  }

  if (status === RESEARCH_POST_STATUS_ARCHIVED) {
    return "Hunted";
  }

  return getPostHealthLabel(getPostHealthState(health, stake));
}

async function loadAuthors(ids: string[]) {
  const unique = [...new Set(ids)];

  if (unique.length === 0) {
    return new Map<string, AuthorRow>();
  }

  const withAvatar = await supabase
    .from("profiles")
    .select("id, username, display_name, tier, avatar_url")
    .in("id", unique);
  const result =
    withAvatar.error?.message.includes("avatar_url")
      ? await supabase.from("profiles").select("id, username, display_name, tier").in("id", unique)
      : withAvatar;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return new Map((result.data as AuthorRow[]).map((row) => [row.id, row]));
}

async function loadUnlockIds(userId: string, postIds: string[]) {
  if (postIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from("post_unlocks")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) {
    return new Set<string>();
  }

  return new Set((data ?? []).map((row) => row.post_id as string));
}

function toNote(
  post: PostRow,
  author: AuthorRow | undefined,
  viewer: DeskProfile,
  unlocked: boolean
): FloorNote {
  const stake = post.original_stake ?? post.current_health ?? 0;
  const health = post.current_health ?? 0;
  const access = withPaidUnlock(
    getDeskAccess(viewer.tier, author?.tier, viewer.role === "admin"),
    unlocked
  );
  const multiple = resolveUnlockRateMultiple(post.unlock_rate_multiple);

  return {
    id: post.id,
    authorId: post.author_id,
    title: post.title,
    body: access === "hidden" ? researchExcerpt(post.body, 880) : post.body,
    status: post.status,
    currentHealth: health,
    originalStake: stake,
    subTopic: post.sub_topic ?? "",
    createdAt: post.created_at,
    authorName: author?.display_name || author?.username || "Desk",
    authorUsername: author?.username ?? "",
    authorTier: resolveTier(author?.tier),
    authorAvatar: author?.avatar_url ?? null,
    access,
    unlockQuote:
      access === "full" ? null : quoteDeskUnlock(viewer.tier, author?.tier, multiple),
    healthLabel: healthLabel(post.status, health, stake),
    healthPercent: getPostHealthPercent(health, stake),
    summary: post.ai_summary?.trim() || null,
    ticker: post.ai_ticker?.trim() || null,
    conviction: post.ai_conviction?.trim() || null,
    claims: access === "hidden" ? [] : textLines(post.ai_claims),
    risks: access === "hidden" ? [] : textLines(post.ai_risks),
  };
}

function textLines(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3)
    : [];
}

export async function loadProfile(userId: string): Promise<DeskProfile> {
  const columns = "id, username, display_name, tier, role, current_hp, utility_tokens";
  const withAvatar = await supabase
    .from("profiles")
    .select(`${columns}, avatar_url`)
    .eq("id", userId)
    .single();
  const result = withAvatar.error?.message.includes("avatar_url")
    ? await supabase.from("profiles").select(columns).eq("id", userId).single()
    : withAvatar;

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = result.data as DeskProfile;
  return { ...row, avatar_url: row.avatar_url ?? null };
}

function databaseStatuses(query: FeedQuery) {
  const selected = query.statuses ?? DEFAULT_FEED_STATUSES;
  const statuses: string[] = [];

  if (selected.includes("battleground")) {
    statuses.push(RESEARCH_POST_STATUS_LIVE);
  }

  if (selected.includes("ascended")) {
    statuses.push(RESEARCH_POST_STATUS_ASCENDED);
  }

  if (selected.includes("hunted")) {
    statuses.push(RESEARCH_POST_STATUS_ARCHIVED);
  }

  return statuses;
}

export async function loadFeed(viewer: DeskProfile, query: FeedQuery) {
  const statuses = databaseStatuses(query);

  if (statuses.length === 0 || (query.topics != null && query.topics.length === 0)) {
    return [];
  }

  if (query.tiers != null && query.tiers.length === 0) {
    return [];
  }

  let request = supabase
    .from("research_posts")
    .select(POST_COLUMNS_AI)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(80);

  if (query.topics != null) {
    request = request.in("sub_topic", query.topics);
  }

  if (query.posted) {
    request = request.gte("created_at", postedSince(query.posted).toISOString());
  }

  let result = await request;

  if (result.error?.message.includes("ai_summary")) {
    let fallback = supabase
      .from("research_posts")
      .select(POST_COLUMNS)
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(80);

    if (query.topics != null) {
      fallback = fallback.in("sub_topic", query.topics);
    }

    if (query.posted) {
      fallback = fallback.gte("created_at", postedSince(query.posted).toISOString());
    }

    result = await fallback;
  }

  const { data, error } = result;

  if (error) {
    throw new Error(error.message);
  }

  const posts = (data ?? []) as PostRow[];
  const authors = await loadAuthors(posts.map((post) => post.author_id));
  const unlocks = await loadUnlockIds(
    viewer.id,
    posts.map((post) => post.id)
  );

  return posts
    .filter((post) => {
      const tier = resolveTier(authors.get(post.author_id)?.tier);
      const tierOk = query.tiers == null || (tier != null && query.tiers.includes(tier));
      return tierOk && postedInWindow(post.created_at, query.posted);
    })
    .map((post) =>
      toNote(post, authors.get(post.author_id), viewer, unlocks.has(post.id))
    );
}

export async function loadThread(viewer: DeskProfile, postId: string) {
  const withAi = await supabase
    .from("research_posts")
    .select(POST_COLUMNS_AI)
    .eq("id", postId)
    .maybeSingle();
  const loaded =
    withAi.error?.message.includes("ai_summary")
      ? await supabase.from("research_posts").select(POST_COLUMNS).eq("id", postId).maybeSingle()
      : withAi;
  const { data, error } = loaded;

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("This note is not on the tape.");
  }

  const post = data as PostRow;
  const authors = await loadAuthors([post.author_id]);
  const unlocks = await loadUnlockIds(viewer.id, [post.id]);
  const note = toNote(post, authors.get(post.author_id), viewer, unlocks.has(post.id));

  if (!canOpenDesk(note.access)) {
    return { note, comments: [] as FloorComment[] };
  }

  const commentsRead = await supabase
    .from("research_comments")
    .select("id, author_id, body, status, current_health, original_stake, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (commentsRead.error) {
    throw new Error(commentsRead.error.message);
  }

  const rows = commentsRead.data ?? [];
  const commentAuthors = await loadAuthors(rows.map((row) => row.author_id as string));

  const commentIds = rows.map((row) => row.id as string);
  const repliesRead =
    commentIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("comment_replies")
          .select("id, comment_id, author_id, body")
          .in("comment_id", commentIds)
          .order("created_at", { ascending: true });
  const replyRows = repliesRead.error ? [] : (repliesRead.data ?? []);
  const replyAuthors = await loadAuthors(replyRows.map((row) => row.author_id as string));
  const repliesByComment = new Map<string, FloorReply[]>();

  for (const row of replyRows) {
    const author = replyAuthors.get(row.author_id as string);
    const list = repliesByComment.get(row.comment_id as string) ?? [];
    list.push({
      id: row.id as string,
      authorId: row.author_id as string,
      body: row.body as string,
      authorName: author?.display_name || author?.username || "Desk",
      authorAvatar: author?.avatar_url ?? null,
    });
    repliesByComment.set(row.comment_id as string, list);
  }

  const comments: FloorComment[] = rows.map((row) => {
    const author = commentAuthors.get(row.author_id as string);
    const stake = (row.original_stake as number | null) ?? (row.current_health as number);
    const health = row.current_health as number;
    const status = row.status as string;
    return {
      id: row.id as string,
      authorId: row.author_id as string,
      body: row.body as string,
      authorName: author?.display_name || author?.username || "Desk",
      authorAvatar: author?.avatar_url ?? null,
      currentHealth: health,
      originalStake: stake,
      status,
      healthLabel: healthLabel(status, health, stake),
      healthPercent: getPostHealthPercent(health, stake),
      replies: repliesByComment.get(row.id as string) ?? [],
    };
  });

  return { note, comments };
}

export async function unlockNote(postId: string) {
  const { error } = await supabase.rpc("purchase_post_unlock", {
    p_post_id: postId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
