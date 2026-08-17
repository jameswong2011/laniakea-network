import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RESEARCH_POST_STATUS_LIVE,
  type ResearchFeedItem,
  type ResearchPost,
  type ResearchPostAuthor,
} from "@/types";

const POST_COLUMNS =
  "id, author_id, title, body, status, current_health, created_at, updated_at";

export async function getLiveResearchFeed(
  supabase: SupabaseClient
): Promise<{ items: ResearchFeedItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("research_posts")
    .select(POST_COLUMNS)
    .eq("status", RESEARCH_POST_STATUS_LIVE)
    .order("created_at", { ascending: false });

  if (error) {
    return { items: [], error: error.message };
  }

  const posts = (data ?? []) as ResearchPost[];
  const authorIds = [...new Set(posts.map((post) => post.author_id))];

  const authorsById = new Map<string, ResearchPostAuthor>();

  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, username, display_name, tier")
      .in("id", authorIds);

    for (const author of (authors ?? []) as ResearchPostAuthor[]) {
      authorsById.set(author.id, author);
    }
  }

  return {
    items: posts.map((post) => ({
      ...post,
      current_health: post.current_health ?? 0,
      author: authorsById.get(post.author_id) ?? null,
    })),
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
