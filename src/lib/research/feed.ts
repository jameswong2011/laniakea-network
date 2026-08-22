import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeskAccess } from "@/lib/research/access";
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

export function researchExcerpt(body: string, max = 220) {
  const compact = body
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (compact.length <= max) {
    return compact;
  }

  return `${compact.slice(0, max).trimEnd()}…`;
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

export function feedHref({
  topics = null,
  tiers = null,
  statuses = null,
}: {
  topics?: SubTopic[] | null;
  tiers?: Tier[] | null;
  statuses?: FeedStatus[] | null;
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

  const query = params.toString();
  return query ? `/feed?${query}` : "/feed";
}

export function feedTopicHref(
  selected: SubTopic[] | null,
  toggle: SubTopic,
  tiers: Tier[] | null = null,
  statuses: FeedStatus[] | null = null
) {
  const current = selected ?? [...SUB_TOPICS];
  const next = current.includes(toggle)
    ? current.filter((topic) => topic !== toggle)
    : [...current, toggle];

  return feedHref({ topics: next, tiers, statuses });
}

export function feedTierHref(
  selected: Tier[] | null,
  toggle: Tier,
  topics: SubTopic[] | null = null,
  statuses: FeedStatus[] | null = null
) {
  const current = selected ?? [...TIERS];
  const next = current.includes(toggle)
    ? current.filter((tier) => tier !== toggle)
    : [...current, toggle];

  return feedHref({ topics, tiers: next, statuses });
}

export function feedStatusHref(
  selected: FeedStatus[] | null,
  toggle: FeedStatus,
  topics: SubTopic[] | null = null,
  tiers: Tier[] | null = null
) {
  const current = activeFeedStatuses(selected);
  const next = current.includes(toggle)
    ? current.filter((status) => status !== toggle)
    : [...current, toggle];

  return feedHref({ topics, tiers, statuses: next });
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
  statuses: FeedStatus[] | null = null
) {
  return feedHref({ topics: selected, tiers, statuses });
}

export function itemMatchesFeedTopics(
  item: Pick<ResearchPost, "sub_topic">,
  selected: SubTopic[] | null
) {
  if (selected == null) {
    return true;
  }

  const topic = resolveSubTopic(item.sub_topic);
  return Boolean(topic && selected.includes(topic));
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

export function itemMatchesFeedStatuses(
  item: Pick<ResearchPost, "status">,
  selected: FeedStatus[] | null
) {
  const outcome = feedStatusOf(item.status);
  return Boolean(outcome && activeFeedStatuses(selected).includes(outcome));
}

const POST_COLUMNS =
  "id, author_id, title, body, status, current_health, original_stake, sub_topic, unlock_rate_multiple, created_at, updated_at";

const POST_COLUMNS_WITHOUT_UNLOCK =
  "id, author_id, title, body, status, current_health, original_stake, sub_topic, created_at, updated_at";

const FEED_POST_STATUSES = [
  RESEARCH_POST_STATUS_LIVE,
  RESEARCH_POST_STATUS_ASCENDED,
  RESEARCH_POST_STATUS_ARCHIVED,
];

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

  for (const author of (authors ?? []) as ResearchPostAuthor[]) {
    authorsById.set(author.id, author);
  }

  const { data: ranks } = await supabase
    .from("subtopic_ranks")
    .select("user_id, sub_topic, tier")
    .in("user_id", authorIds);

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
    body: access === "hidden" ? researchExcerpt(post.body) : post.body,
    author,
    authorTopicTier: topic
      ? (topicTiers.get(`${post.author_id}:${topic}`) ?? deskTier)
      : deskTier,
    deskTier,
    access,
    unlockQuote,
  };
}

export async function getLiveResearchFeed(
  supabase: SupabaseClient,
  viewer?: FeedViewer
): Promise<{ items: ResearchFeedItem[]; error: string | null }> {
  const withUnlock = await supabase
    .from("research_posts")
    .select(POST_COLUMNS)
    .in("status", FEED_POST_STATUSES)
    .order("created_at", { ascending: false });

  const withTopic =
    withUnlock.error && withUnlock.error.message.includes("unlock_rate_multiple")
      ? await supabase
          .from("research_posts")
          .select(POST_COLUMNS_WITHOUT_UNLOCK)
          .in("status", FEED_POST_STATUSES)
          .order("created_at", { ascending: false })
      : withUnlock;

  const withoutStake =
    withTopic.error && withTopic.error.message.includes("original_stake")
      ? await supabase
          .from("research_posts")
          .select(
            "id, author_id, title, body, status, current_health, sub_topic, created_at, updated_at"
          )
          .in("status", FEED_POST_STATUSES)
          .order("created_at", { ascending: false })
      : withTopic;

  const legacy =
    withoutStake.error && withoutStake.error.message.includes("sub_topic")
      ? await supabase
          .from("research_posts")
          .select(
            "id, author_id, title, body, status, current_health, created_at, updated_at"
          )
          .eq("status", RESEARCH_POST_STATUS_LIVE)
          .order("created_at", { ascending: false })
      : null;

  const { data, error } = legacy ?? withoutStake;

  if (error) {
    return { items: [], error: error.message };
  }

  const posts = normalizePosts(data as RawPost[] | null);
  const { authorsById, topicTiers } = await loadAuthorMeta(
    supabase,
    [...new Set(posts.map((post) => post.author_id))]
  );
  const unlockIds = await loadViewerUnlockIds(
    supabase,
    viewer?.userId,
    posts.map((post) => post.id)
  );

  return {
    items: posts.flatMap((post) => {
      const item = toFeedItem(
        post,
        viewer,
        authorsById,
        topicTiers,
        unlockIds.has(post.id)
      );
      return item ? [item] : [];
    }),
    error: null,
  };
}

export async function getResearchPostById(
  supabase: SupabaseClient,
  postId: string,
  viewer?: FeedViewer
): Promise<{ item: ResearchFeedItem | null; error: string | null }> {
  const withUnlock = await supabase
    .from("research_posts")
    .select(POST_COLUMNS)
    .eq("id", postId)
    .maybeSingle();

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

  const { authorsById, topicTiers } = await loadAuthorMeta(supabase, [
    post.author_id,
  ]);
  const unlockIds = await loadViewerUnlockIds(
    supabase,
    viewer?.userId,
    [post.id]
  );

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
