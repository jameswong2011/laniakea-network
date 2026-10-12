import type { AiFeature } from "@/lib/ai/openrouter";
import { createServiceClient } from "@/lib/supabase/admin";

const HOURLY_LIMIT: Record<AiFeature, number> = {
  ask: 30,
  brief: 10,
  comments: 20,
  search: 30,
};

export const AI_LIMIT_MESSAGE = "Hourly limit reached. Try again in a little while.";

export async function overAiLimit(userId: string, feature: AiFeature) {
  const admin = createServiceClient();

  if (!admin) {
    return false;
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", since);

  return !error && (count ?? 0) >= HOURLY_LIMIT[feature];
}
