import { createServiceClient } from "@/lib/supabase/admin";

const MODEL = "z-ai/glm-5.3";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type AiFeature = "ask" | "brief" | "comments" | "search";

export type AiCall = {
  feature: AiFeature;
  userId?: string | null;
};

const TIMEOUT_MS: Record<AiFeature, number> = {
  ask: 30_000,
  brief: 60_000,
  comments: 45_000,
  search: 30_000,
};

type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

export async function completeJson(prompt: string, maxTokens = 900, call?: AiCall) {
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    return null;
  }

  const response = await send(
    key,
    JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Reply with one JSON object and no markdown fence.",
        },
        { role: "user", content: prompt },
      ],
      reasoning: { effort: "low" },
      max_tokens: maxTokens,
    }),
    call ? TIMEOUT_MS[call.feature] : 30_000
  );

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null; reasoning?: string | null } }[];
    usage?: Usage;
  } | null;

  if (!payload) {
    return null;
  }

  await recordUsage(call, payload.usage);
  const message = payload.choices?.[0]?.message;
  const text = message?.content || message?.reasoning || "";
  return readJson(text);
}

async function send(key: string, body: string, timeoutMs: number) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const retryable = response.status === 429 || response.status >= 500;

      if (!retryable || attempt === 1) {
        return response;
      }
    } catch (cause) {
      if (attempt === 1 || (cause instanceof Error && cause.name === "TimeoutError")) {
        return null;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return null;
}

async function recordUsage(call: AiCall | undefined, usage: Usage | undefined) {
  if (!call) {
    return;
  }

  const admin = createServiceClient();

  if (!admin) {
    return;
  }

  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;

  await admin.from("ai_usage").insert({
    user_id: call.userId ?? null,
    feature: call.feature,
    model: MODEL,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: usage?.total_tokens ?? promptTokens + completionTokens,
    cost_usd: usage?.cost ?? 0,
  });
}

function readJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start < 0 || end <= start) {
    return null;
  }

  try {
    const value = JSON.parse(text.slice(start, end + 1)) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function textList(value: unknown, count: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 280))
    .slice(0, count);
}

export function textField(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
