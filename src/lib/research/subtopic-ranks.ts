import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveSubTopic,
  resolveTier,
  type SubTopic,
  type SubtopicRank,
  type Tier,
} from "@/types";

export async function recordSubtopicParticipation(
  supabase: SupabaseClient,
  userId: string,
  subTopic: SubTopic,
  hpDelta: number
): Promise<{ error: string | null }> {
  const { data: existing, error: readError } = await supabase
    .from("subtopic_ranks")
    .select("current_hp")
    .eq("user_id", userId)
    .eq("sub_topic", subTopic)
    .maybeSingle();

  if (readError) {
    return { error: readError.message };
  }

  const now = new Date().toISOString();

  if (!existing) {
    const { error } = await supabase.from("subtopic_ranks").insert({
      user_id: userId,
      sub_topic: subTopic,
      tier: "Bronze",
      current_hp: Math.max(hpDelta, 0),
      updated_at: now,
    });

    return { error: error?.message ?? null };
  }

  const { error } = await supabase
    .from("subtopic_ranks")
    .update({
      current_hp: existing.current_hp + hpDelta,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("sub_topic", subTopic);

  return { error: error?.message ?? null };
}

export async function getEngagedTopics(
  supabase: SupabaseClient,
  userId: string
): Promise<SubTopic[]> {
  const { data, error } = await supabase
    .from("subtopic_ranks")
    .select("sub_topic, current_hp")
    .eq("user_id", userId)
    .order("current_hp", { ascending: false });

  if (error) {
    return [];
  }

  const topics: SubTopic[] = [];

  for (const row of data ?? []) {
    const topic = resolveSubTopic(row.sub_topic as string);

    if (topic && !topics.includes(topic)) {
      topics.push(topic);
    }
  }

  return topics;
}

export async function getSubtopicRanks(
  supabase: SupabaseClient,
  subTopic?: SubTopic
): Promise<{ ranks: SubtopicRank[]; error: string | null }> {
  let query = supabase
    .from("subtopic_ranks")
    .select("user_id, sub_topic, tier, current_hp, created_at, updated_at")
    .order("current_hp", { ascending: false });

  if (subTopic) {
    query = query.eq("sub_topic", subTopic);
  }

  const { data, error } = await query;

  if (error) {
    if (
      error.message.includes("schema cache") ||
      error.message.includes("does not exist")
    ) {
      return { ranks: [], error: null };
    }

    return { ranks: [], error: error.message };
  }

  return { ranks: (data ?? []) as SubtopicRank[], error: null };
}

export type TopicStanding = {
  subTopic: SubTopic;
  tier: Tier;
  currentHp: number;
  rank: number;
  participants: number;
};

export function topicStandingsForUser(
  ranks: SubtopicRank[],
  userId: string
): TopicStanding[] {
  const byTopic = new Map<SubTopic, SubtopicRank[]>();

  for (const rank of ranks) {
    const topic = resolveSubTopic(rank.sub_topic);

    if (!topic) {
      continue;
    }

    const list = byTopic.get(topic) ?? [];
    list.push(rank);
    byTopic.set(topic, list);
  }

  const standings: TopicStanding[] = [];

  for (const [subTopic, list] of byTopic) {
    const sorted = [...list].sort((a, b) => {
      if (b.current_hp !== a.current_hp) {
        return b.current_hp - a.current_hp;
      }

      return a.user_id.localeCompare(b.user_id);
    });

    const index = sorted.findIndex((row) => row.user_id === userId);

    if (index === -1) {
      continue;
    }

    const row = sorted[index];
    const tier = resolveTier(row.tier) ?? "Bronze";

    standings.push({
      subTopic,
      tier,
      currentHp: row.current_hp,
      rank: index + 1,
      participants: sorted.length,
    });
  }

  return standings.sort((a, b) => b.currentHp - a.currentHp);
}

export function topicBooksByUser(
  ranks: SubtopicRank[],
  limit = 2
): Map<string, TopicStanding[]> {
  const books = new Map<string, TopicStanding[]>();
  const userIds = new Set(ranks.map((rank) => rank.user_id));

  for (const userId of userIds) {
    books.set(userId, topicStandingsForUser(ranks, userId).slice(0, limit));
  }

  return books;
}
