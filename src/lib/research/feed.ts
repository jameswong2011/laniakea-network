import type { SupabaseClient } from "@supabase/supabase-js";
import { researchExcerpt as excerptNote, postedInWindow, postedSince, resolveFeedPosted, FEED_POSTED_LABELS, type FeedPosted } from "@laniakea/domain";
import { getDeskAccess } from "@/lib/research/access";
import { isMissingOpenNotes, OPEN_NOTES, type NoteRelation } from "@/lib/research/open-notes";
import {
  loadViewerUnlockIds,
  quoteDeskUnlock,
  resolveUnlockRateMultiple,
  withPaidUnlock,
} from "@/lib/research/unlock";
import {
  RESEARCH_POST_STATUS_ARCHIVED,
  RESEARCH_POST_STATUS_ASCENDED,
  RESEARCH_POST_STATUS_LIVE,
  SUB_TOPICS,
  TIERS,
  resolveSubTopic,
  resolveTier,
  type ResearchFeedItem,
  type ResearchPost,
  type ResearchPostAuthor,
  type SubTopic,
  type SubtopicRank,
  type Tier,
} from "@/types";

export function researchPostPath(postId: string) {
  return `/feed/${postId}`;
}

export function researchCommentPath(postId: string, commentId: string) {
  return `/feed/${postId}?comment=${commentId}`;
}

export function researchReplyPath(
  postId: string,
  commentId: string,
  replyId: string
) {
  return `/feed/${postId}?comment=${commentId}&reply=${replyId}`;
}

export function researchComposePath() {
  return "/feed/new";
}

export type { FeedPosted };
export { FEED_POSTED_LABELS, postedInWindow, resolveFeedPosted };

export function researchExcerpt(body: string, max = 220) {
  return excerptNote(body, max);
}

export function parseFeedPosted(
  postedParam: string | string[] | undefined
): FeedPosted | null {
  const value = Array.isArray(postedParam) ? postedParam[0] : postedParam;
  return resolveFeedPosted(value);
}

/** null = every sub-topic (the default). */
export function parseFeedTopics(
  topicParam: string | string[] | undefined
): SubTopic[] | null {
  if (topicParam == null) {
    return null;
  }

  const values = Array.isArray(topicParam) ? topicParam : [topicParam];
  const selected = values
    .map((value) => resolveSubTopic(value))
    .filter((topic): topic is SubTopic => Boolean(topic));

  if (selected.length === 0) {
    return [];
  }

  if (selected.length === SUB_TOPICS.length) {
    return null;
  }

  return selected;
}

export const FEED_STATUSES = ["battleground", "ascended", "hunted"] as const;
export type FeedStatus = (typeof FEED_STATUSES)[number];

export const FEED_STATUS_LABELS: Record<FeedStatus, string> = {
  battleground: "Battleground",
  ascended: "Ascended",
  hunted: "Hunted",
};

/** Main tape: live fights plus ascended. Hunted is opt-in. */
export const DEFAULT_FEED_STATUSES: FeedStatus[] = [
  "battleground",
  "ascended",
];

export function resolveFeedStatus(
  value: string | null | undefined
): FeedStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return FEED_STATUSES.find((status) => status === normalized) ?? null;
}

export function feedStatusOf(status: string | null | undefined): FeedStatus | null {
  if (status === RESEARCH_POST_STATUS_LIVE) {
    return "battleground";
  }

  if (status === RESEARCH_POST_STATUS_ASCENDED) {
    return "ascended";
  }

  if (status === RESEARCH_POST_STATUS_ARCHIVED) {
    return "hunted";
  }

  return null;
}

function sameStatuses(left: FeedStatus[], right: FeedStatus[]) {
  return (
    left.length === right.length && left.every((status) => right.includes(status))
  );
}

/** null = battleground + ascended (the default tape). */
export function parseFeedStatuses(
  statusParam: string | string[] | undefined
): FeedStatus[] | null {
  if (statusParam == null) {
    return null;
  }

  const values = Array.isArray(statusParam) ? statusParam : [statusParam];
  const selected = values
    .map((value) => resolveFeedStatus(value))
    .filter((status): status is FeedStatus => Boolean(status));

  if (selected.length === 0) {
    return [];
  }

  if (sameStatuses(selected, DEFAULT_FEED_STATUSES)) {
    return null;
  }

  return selected;
}

function activeFeedStatuses(selected: FeedStatus[] | null) {
  return selected ?? DEFAULT_FEED_STATUSES;
}

/** null = every research tier (the default). */
export function parseFeedTiers(
  tierParam: string | string[] | undefined
): Tier[] | null {
  if (tierParam == null) {
    return null;
  }

  const values = Array.isArray(tierParam) ? tierParam : [tierParam];
  const selected = values
    .map((value) => resolveTier(value))
    .filter((tier): tier is Tier => Boolean(tier));

  if (selected.length === 0) {
    return [];
  }

  if (selected.length === TIERS.length) {
    return null;
  }

  return selected;
}

export type FeedQuery = {
  topics: SubTopic[] | null;
  tiers: Tier[] | null;
  statuses: FeedStatus[] | null;
  posted: FeedPosted | null;
};

export function feedHeadingTitle(query: FeedQuery) {
  if (query.topics?.length === 1 && query.tiers?.length === 1) {
    return `${query.tiers[0]} · ${query.topics[0]}`;
  }

  if (query.topics?.length === 1) {
    return query.topics[0];
  }

  if (query.tiers?.length === 1) {
    return `${query.tiers[0]} users`;
  }

  if (query.statuses?.length === 1) {
    return FEED_STATUS_LABELS[query.statuses[0]];
  }

  if (query.posted) {
    return FEED_POSTED_LABELS[query.posted];
  }

  return "Main Feed";
}

export function feedHref({
  topics = null,
  tiers = null,
  statuses = null,
  posted = null,
}: {
  topics?: SubTopic[] | null;
  tiers?: Tier[] | null;
  statuses?: FeedStatus[] | null;
  posted?: FeedPosted | null;
} = {}) {
  const params = new URLSearchParams();
  const topicFilter =
    topics == null || topics.length === SUB_TOPICS.length ? null : topics;
  const tierFilter = tiers == null || tiers.length === TIERS.length ? null : tiers;
  const statusFilter =
    statuses == null || sameStatuses(statuses, DEFAULT_FEED_STATUSES)
      ? null
      : statuses;

  if (topicFilter) {
    if (topicFilter.length === 0) {
      params.append("topic", "");
    } else {
      for (const topic of SUB_TOPICS) {
        if (topicFilter.includes(topic)) {
          params.append("topic", topic);
        }
      }
    }
  }

  if (tierFilter) {
    if (tierFilter.length === 0) {
      params.append("tier", "");
    } else {
      for (const tier of TIERS) {
        if (tierFilter.includes(tier)) {
          params.append("tier", tier);
        }
      }
    }
  }

  if (statusFilter) {
    if (statusFilter.length === 0) {
      params.append("status", "");
    } else {
      for (const status of FEED_STATUSES) {
        if (statusFilter.includes(status)) {
          params.append("status", status);
        }
      }
    }
  }

  if (posted) {
    params.set("posted", posted);
  }

  const query = params.toString();
  return query ? `/feed?${query}` : "/feed";
}

export function feedTopicHref(
  selected: SubTopic[] | null,
  toggle: SubTopic,
  tiers: Tier[] | null = null,
  statuses: FeedStatus[] | null = null,
  posted: FeedPosted | null = null
) {
  const current = selected ?? [...SUB_TOPICS];
  const next = current.includes(toggle)
    ? current.filter((topic) => topic !== toggle)
    : [...current, toggle];

  return feedHref({ topics: next, tiers, statuses, posted });
}

export function feedTierHref(
  selected: Tier[] | null,
  toggle: Tier,
  topics: SubTopic[] | null = null,
  statuses: FeedStatus[] | null = null,
  posted: FeedPosted | null = null
) {
  const current = selected ?? [...TIERS];
  const next = current.includes(toggle)
    ? current.filter((tier) => tier !== toggle)
    : [...current, toggle];

  return feedHref({ topics, tiers: next, statuses, posted });
}

export function feedStatusHref(
  selected: FeedStatus[] | null,
  toggle: FeedStatus,
  topics: SubTopic[] | null = null,
  tiers: Tier[] | null = null,
  posted: FeedPosted | null = null
) {
  const current = activeFeedStatuses(selected);
  const next = current.includes(toggle)
    ? current.filter((status) => status !== toggle)
    : [...current, toggle];

  return feedHref({ topics, tiers, statuses: next, posted });
}

export function feedSingleTopicHref(topic: SubTopic) {
  return feedHref({ topics: [topic] });
}

export function feedSingleTierHref(tier: Tier) {
  return feedHref({ tiers: [tier] });
}

export function feedTopicsHref(
  selected: SubTopic[],
  tiers: Tier[] | null = null,
  statuses: FeedStatus[] | null = null,
  posted: FeedPosted | null = null
) {
  return feedHref({ topics: selected, tiers, statuses, posted });
}

export function itemMatchesFeedTiers(
  item: Pick<ResearchFeedItem, "deskTier">,
  selected: Tier[] | null
) {
  if (selected == null) {
    return true;
  }

  return Boolean(item.deskTier && selected.includes(item.deskTier));
}

const POST_COLUMNS =
  "id, author_id, title, body, status, current_health, original_stake, sub_topic, unlock_rate_multiple, created_at, updated_at";

const POST_COLUMNS_AI = `${POST_COLUMNS}, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks`;

const POST_COLUMNS_WITHOUT_UNLOCK =
  "id, author_id, title, body, status, current_health, original_stake, sub_topic, created_at, updated_at";

type FeedViewer = {
  userId?: string;
  tier?: string | null;
  isAdmin?: boolean;
};

type RawPost = Omit<
  ResearchPost,
  "sub_topic" | "original_stake" | "unlock_rate_multiple"
> & {
  sub_topic?: string;
  original_stake?: number | null;
  unlock_rate_multiple?: number | null;
};

function normalizePosts(rows: RawPost[] | null): ResearchPost[] {
  return (rows ?? []).map((post) => ({
    ...post,
    sub_topic: post.sub_topic ?? "",
    original_stake: post.original_stake ?? post.current_health ?? 0,
    current_health: post.current_health ?? 0,
    unlock_rate_multiple: resolveUnlockRateMultiple(post.unlock_rate_multiple),
  }));
}

async function loadAuthorMeta(
  supabase: SupabaseClient,
  authorIds: string[]
) {
  const authorsById = new Map<string, ResearchPostAuthor>();
  const topicTiers = new Map<string, ReturnType<typeof resolveTier>>();

  if (authorIds.length === 0) {
    return { authorsById, topicTiers };
  }

  const [authorsWithAvatar, { data: ranks }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, tier, avatar_url")
      .in("id", authorIds),
    supabase
      .from("subtopic_ranks")
      .select("user_id, sub_topic, tier")
      .in("user_id", authorIds),
  ]);
  const { data: authors } =
    authorsWithAvatar.error &&
    authorsWithAvatar.error.message.includes("avatar_url")
      ? await supabase
          .from("profiles")
          .select("id, username, display_name, tier")
          .in("id", authorIds)
      : authorsWithAvatar;

  for (const author of (authors ?? []) as ResearchPostAuthor[]) {
    authorsById.set(author.id, author);
  }

  for (const rank of (ranks ?? []) as Pick<
    SubtopicRank,
    "user_id" | "sub_topic" | "tier"
  >[]) {
    const topic = resolveSubTopic(rank.sub_topic);

    if (!topic) {
      continue;
    }

    topicTiers.set(`${rank.user_id}:${topic}`, resolveTier(rank.tier));
  }

  return { authorsById, topicTiers };
}

function toFeedItem(
  post: ResearchPost,
  viewer: FeedViewer | undefined,
  authorsById: Map<string, ResearchPostAuthor>,
  topicTiers: Map<string, ReturnType<typeof resolveTier>>,
  unlocked: boolean
): ResearchFeedItem | null {
  const topic = resolveSubTopic(post.sub_topic);
  const author = authorsById.get(post.author_id) ?? null;
  const deskTier = resolveTier(author?.tier);
  const access = withPaidUnlock(
    getDeskAccess(viewer?.tier, author?.tier, viewer?.isAdmin ?? false),
    unlocked
  );
  const unlockQuote =
    access === "full"
      ? null
      : quoteDeskUnlock(viewer?.tier, author?.tier, post.unlock_rate_multiple);

  return {
    ...post,
    ...(access === "hidden"
      ? { body: researchExcerpt(post.body), ai_claims: [], ai_risks: [] }
      : {}),
    author,
    authorTopicTier: topic
      ? (topicTiers.get(`${post.author_id}:${topic}`) ?? deskTier)
      : deskTier,
    deskTier,
    access,
    unlockQuote,
  };
}

export const FEED_PAGE_SIZE = 40;

const CARD_COLUMNS =
  "id, author_id, title, status, current_health, original_stake, sub_topic, unlock_rate_multiple, created_at, updated_at";

const FEED_SOURCES: { relation: NoteRelation; columns: string }[] = [
  { relation: OPEN_NOTES, columns: `${CARD_COLUMNS}, body_preview, ai_summary` },
  ...[
    `${CARD_COLUMNS}, body_preview, ai_summary`,
    `${CARD_COLUMNS}, body, ai_summary`,
    `${CARD_COLUMNS}, body`,
    POST_COLUMNS_WITHOUT_UNLOCK,
    "id, author_id, title, body, status, current_health, sub_topic, created_at, updated_at",
  ].map((columns) => ({ relation: "research_posts" as const, columns })),
];

const FEED_DB_STATUS: Record<FeedStatus, string> = {
  battleground: RESEARCH_POST_STATUS_LIVE,
  ascended: RESEARCH_POST_STATUS_ASCENDED,
  hunted: RESEARCH_POST_STATUS_ARCHIVED,
};

export type FeedPageOptions = {
  query: FeedQuery;
  before?: string | null;
  timezoneOffset?: number;
  limit?: number;
};

export type FeedPage = {
  items: ResearchFeedItem[];
  error: string | null;
  nextCursor: string | null;
};

/** Today starts at the reader's midnight, from their UTC offset in minutes. */
export function feedPostedSince(posted: FeedPosted, timezoneOffset = 0, now = new Date()) {
  if (posted !== "today") {
    return postedSince(posted, now);
  }

  const local = new Date(now.getTime() - timezoneOffset * 60_000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + timezoneOffset * 60_000);
}

export function parseFeedBefore(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) {
    return null;
  }

  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function feedPageHref(query: FeedQuery, before: string) {
  const base = feedHref(query);
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}before=${encodeURIComponent(before)}`;
}

function isSchemaError(error: { code?: string; message: string }) {
  return (
    ["42703", "42883", "PGRST100", "PGRST200", "PGRST201"].includes(error.code ?? "") ||
    /does not exist|could not find|schema cache|relationship/i.test(error.message)
  );
}

function feedRequest(
  supabase: SupabaseClient,
  { relation, columns }: (typeof FEED_SOURCES)[number],
  options: FeedPageOptions,
  statuses: string[],
  tierJoin: boolean
) {
  const { query } = options;
  let request = supabase
    .from(relation)
    .select(tierJoin ? `${columns}, profiles!inner(tier)` : columns)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit((options.limit ?? FEED_PAGE_SIZE) + 1);

  if (query.topics) {
    request = request.in("sub_topic", query.topics);
  }

  if (query.posted) {
    request = request.gte(
      "created_at",
      feedPostedSince(query.posted, options.timezoneOffset).toISOString()
    );
  }

  if (options.before) {
    request = request.lt("created_at", options.before);
  }

  if (tierJoin && query.tiers) {
    request = request.in(
      "profiles.tier",
      [...new Set(query.tiers.flatMap((tier) => [tier, tier.toLowerCase()]))]
    );
  }

  return request;
}

export async function getLiveResearchFeed(
  supabase: SupabaseClient,
  viewer: FeedViewer | undefined,
  options: FeedPageOptions
): Promise<FeedPage> {
  const { query } = options;
  const statuses = activeFeedStatuses(query.statuses).map((status) => FEED_DB_STATUS[status]);

  if (statuses.length === 0 || query.topics?.length === 0 || query.tiers?.length === 0) {
    return { items: [], error: null, nextCursor: null };
  }

  const limit = options.limit ?? FEED_PAGE_SIZE;
  let tierJoin = query.tiers != null;
  let source = 0;
  let result = await feedRequest(supabase, FEED_SOURCES[source], options, statuses, tierJoin);

  while (result.error && (isMissingOpenNotes(result.error) || isSchemaError(result.error))) {
    if (isMissingOpenNotes(result.error)) {
      source += 1;
    } else if (tierJoin && /profiles|relationship/i.test(result.error.message)) {
      tierJoin = false;
    } else if (source < FEED_SOURCES.length - 1) {
      source += 1;
    } else {
      break;
    }

    result = await feedRequest(supabase, FEED_SOURCES[source], options, statuses, tierJoin);
  }

  if (result.error) {
    return { items: [], error: result.error.message, nextCursor: null };
  }

  const rows = (result.data ?? []) as unknown as (RawPost & {
    body?: string | null;
    body_preview?: string | null;
    profiles?: unknown;
  })[];
  const page = rows.slice(0, limit).map((row) => {
    const post = { ...row, body: row.body ?? row.body_preview ?? "" };
    delete post.body_preview;
    delete post.profiles;
    return post;
  });
  const posts = normalizePosts(page as RawPost[]);
  const [{ authorsById, topicTiers }, unlockIds] = await Promise.all([
    loadAuthorMeta(supabase, [...new Set(posts.map((post) => post.author_id))]),
    loadViewerUnlockIds(
      supabase,
      viewer?.userId,
      posts.map((post) => post.id)
    ),
  ]);

  return {
    items: posts.flatMap((post) => {
      const item = toFeedItem(
        post,
        viewer,
        authorsById,
        topicTiers,
        unlockIds.has(post.id)
      );
      return item && (tierJoin || itemMatchesFeedTiers(item, query.tiers)) ? [item] : [];
    }),
    error: null,
    nextCursor: rows.length > limit ? (page[page.length - 1]?.created_at ?? null) : null,
  };
}

export async function getResearchPostById(
  supabase: SupabaseClient,
  postId: string,
  viewer?: FeedViewer
): Promise<{ item: ResearchFeedItem | null; error: string | null }> {
  const viaView = await supabase
    .from(OPEN_NOTES)
    .select(POST_COLUMNS_AI)
    .eq("id", postId)
    .maybeSingle();

  const withAi = isMissingOpenNotes(viaView.error)
    ? await supabase
        .from("research_posts")
        .select(POST_COLUMNS_AI)
        .eq("id", postId)
        .maybeSingle()
    : viaView;

  const withUnlock =
    withAi.error && withAi.error.message.includes("ai_summary")
      ? await supabase
          .from("research_posts")
          .select(POST_COLUMNS)
          .eq("id", postId)
          .maybeSingle()
      : withAi;

  const withStake =
    withUnlock.error && withUnlock.error.message.includes("unlock_rate_multiple")
      ? await supabase
          .from("research_posts")
          .select(POST_COLUMNS_WITHOUT_UNLOCK)
          .eq("id", postId)
          .maybeSingle()
      : withUnlock;

  const postRead =
    withStake.error && withStake.error.message.includes("original_stake")
      ? await supabase
          .from("research_posts")
          .select(
            "id, author_id, title, body, status, current_health, sub_topic, created_at, updated_at"
          )
          .eq("id", postId)
          .maybeSingle()
      : withStake;

  if (postRead.error) {
    return { item: null, error: postRead.error.message };
  }

  if (!postRead.data) {
    return { item: null, error: null };
  }

  const posts = normalizePosts([postRead.data as RawPost]);
  const post = posts[0];

  if (!post) {
    return { item: null, error: null };
  }

  const [{ authorsById, topicTiers }, unlockIds] = await Promise.all([
    loadAuthorMeta(supabase, [post.author_id]),
    loadViewerUnlockIds(supabase, viewer?.userId, [post.id]),
  ]);

  return {
    item: toFeedItem(
      post,
      viewer,
      authorsById,
      topicTiers,
      unlockIds.has(post.id)
    ),
    error: null,
  };
}

export async function getViewerVotes(
  supabase: SupabaseClient,
  userId: string,
  postIds: string[]
): Promise<Record<string, number>> {
  if (postIds.length === 0) {
    return {};
  }

  const { data } = await supabase
    .from("votes")
    .select("post_id, value")
    .eq("user_id", userId)
    .in("post_id", postIds);

  const votes: Record<string, number> = {};

  for (const row of data ?? []) {
    votes[row.post_id] = row.value;
  }

  return votes;
}
