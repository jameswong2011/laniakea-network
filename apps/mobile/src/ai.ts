import { supabase } from "./supabase";

const SITE = process.env.EXPO_PUBLIC_SITE_URL ?? "https://www.laniakea.finance";

export type NoteBrief = {
  summary: string;
  ticker: string | null;
  conviction: string | null;
  claims: string[];
  risks: string[];
};

export type CommentBrief = {
  agreement: string;
  objection: string;
};

export type MeaningHit = {
  id: string;
  title: string;
  summary: string;
};

async function postAi<T>(path: string, body: unknown): Promise<T | null> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    return null;
  }

  const response = await fetch(`${SITE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export function requestNoteBrief(postId: string, refresh = false) {
  return postAi<{ brief?: NoteBrief }>(`/api/ai/brief`, { postId, refresh });
}

export function requestCommentBrief(postId: string) {
  return postAi<{ brief?: CommentBrief | null }>(`/api/ai/comments`, { postId });
}

export function askNote(postId: string, question: string) {
  return postAi<{ answer?: string; section?: string; error?: string }>(`/api/ai/ask`, {
    postId,
    question,
  });
}

export function searchByMeaning(query: string) {
  return postAi<{ hits?: MeaningHit[] }>(`/api/ai/search`, { query });
}
