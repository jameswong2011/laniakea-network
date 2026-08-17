import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeskAccess } from "@/lib/research/access";
import {
  RESEARCH_POST_STATUS_ASCENDED,
  RESEARCH_POST_STATUS_LIVE,
  resolveSubTopic,
  resolveTier,
  type ResearchFeedItem,
  type ResearchPost,
  type ResearchPostAuthor,
  type SubtopicRank,
} from "@/types";

export function researchPostPath(postId: string) {
  return `/feed/${postId}`;
}

const POST_COLUMNS =
  "id, author_id, title, body, status, current_health, original_stake, sub_topic, created_at, updated_at";

const FEED_STATUSES = [RESEARCH_POST_STATUS_LIVE, RESEARCH_POST_STATUS_ASCENDED];

type RawPost = Omit<ResearchPost, "sub_topic" | "original_stake"> & {
  sub_topic?: string;
  original_stake?: number | null;
};

function normalizePosts(rows: RawPost[] | null): ResearchPost[] {
  return (rows ?? []).map((post) => ({
    ...post,
    sub_topic: post.sub_topic ?? "",
    original_stake: post.original_stake ?? post.current_health ?? 0,
    current_health: post.current_health ?? 0,
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

  const { data: authors } = await supabase
    .from("profiles")
    .select("id, username, display_name, tier")
    .in("id", authorIds);

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
  viewer: { tier?: string | null; isAdmin?: boolean } | undefined,
  authorsById: Map<string, ResearchPostAuthor>,
  topicTiers: Map<string, ReturnType<typeof resolveTier>>
): ResearchFeedItem | null {
  const topic = resolveSubTopic(post.sub_topic);
  const author = authorsById.get(post.author_id) ?? null;
  const deskTier = resolveTier(author?.tier);
  const access = getDeskAccess(
    viewer?.tier,
    author?.tier,
    viewer?.isAdmin ?? false
  );

  if (access === "hidden") {
    return null;
  }

  return {
    ...post,
    author,
    authorTopicTier: topic
      ? (topicTiers.get(`${post.author_id}:${topic}`) ?? deskTier)
      : deskTier,
    deskTier,
    access,
  };
}

export async function getLiveResearchFeed(
  supabase: SupabaseClient,
  viewer?: { tier?: string | null; isAdmin?: boolean }
): Promise<{ items: ResearchFeedItem[]; error: string | null }> {
  const withTopic = await supabase
    .from("research_posts")
    .select(POST_COLUMNS)
    .in("status", FEED_STATUSES)
    .order("created_at", { ascending: false });

  const withoutStake =
    withTopic.error && withTopic.error.message.includes("original_stake")
      ? await supabase
          .from("research_posts")
          .select(
            "id, author_id, title, body, status, current_health, sub_topic, created_at, updated_at"
          )
          .in("status", FEED_STATUSES)
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

  return {
    items: posts.flatMap((post) => {
      const item = toFeedItem(post, viewer, authorsById, topicTiers);
      return item ? [item] : [];
    }),
    error: null,
  };
}

export async function getResearchPostById(
  supabase: SupabaseClient,
  postId: string,
  viewer?: { tier?: string | null; isAdmin?: boolean }
): Promise<{ item: ResearchFeedItem | null; error: string | null }> {
  const withStake = await supabase
    .from("research_posts")
    .select(POST_COLUMNS)
    .eq("id", postId)
    .maybeSingle();

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

  return {
    item: toFeedItem(post, viewer, authorsById, topicTiers),
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
