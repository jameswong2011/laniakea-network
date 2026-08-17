import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RESEARCH_POST_STATUS_LIVE,
  resolveSubTopic,
  resolveTier,
  type ResearchFeedItem,
  type ResearchPost,
  type ResearchPostAuthor,
  type SubtopicRank,
} from "@/types";

const POST_COLUMNS =
  "id, author_id, title, body, status, current_health, sub_topic, created_at, updated_at";

export async function getLiveResearchFeed(
  supabase: SupabaseClient
): Promise<{ items: ResearchFeedItem[]; error: string | null }> {
  const withTopic = await supabase
    .from("research_posts")
    .select(POST_COLUMNS)
    .eq("status", RESEARCH_POST_STATUS_LIVE)
    .order("created_at", { ascending: false });

  const legacy =
    withTopic.error && withTopic.error.message.includes("sub_topic")
      ? await supabase
          .from("research_posts")
          .select(
            "id, author_id, title, body, status, current_health, created_at, updated_at"
          )
          .eq("status", RESEARCH_POST_STATUS_LIVE)
          .order("created_at", { ascending: false })
      : null;

  const { data, error } = legacy ?? withTopic;

  if (error) {
    return { items: [], error: error.message };
  }

  const posts = ((data ?? []) as Array<
    Omit<ResearchPost, "sub_topic"> & { sub_topic?: string }
  >).map((post) => ({
    ...post,
    sub_topic: post.sub_topic ?? "",
  }));
  const authorIds = [...new Set(posts.map((post) => post.author_id))];
  const authorsById = new Map<string, ResearchPostAuthor>();
  const topicTiers = new Map<string, ReturnType<typeof resolveTier>>();

  if (authorIds.length > 0) {
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
  }

  return {
    items: posts.map((post) => {
      const topic = resolveSubTopic(post.sub_topic);
      const author = authorsById.get(post.author_id) ?? null;

      return {
        ...post,
        current_health: post.current_health ?? 0,
        author,
        authorTopicTier: topic
          ? (topicTiers.get(`${post.author_id}:${topic}`) ??
            resolveTier(author?.tier) ??
            null)
          : (resolveTier(author?.tier) ?? null),
      };
    }),
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
