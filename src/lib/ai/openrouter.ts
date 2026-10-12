const MODEL = "z-ai/glm-5.3";

export async function completeJson(prompt: string, maxTokens = 900) {
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    return null;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | null; reasoning?: string | null } }[];
  };
  const message = payload.choices?.[0]?.message;
  const text = message?.content || message?.reasoning || "";
  return readJson(text);
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
