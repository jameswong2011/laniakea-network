import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { ensureCommentBrief } from "@/lib/ai/comment-brief";
import { completeJson, textField, textList } from "@/lib/ai/openrouter";

export type NoteBrief = {
  summary: string;
  ticker: string | null;
  conviction: string | null;
  claims: string[];
  risks: string[];
  agreement: string | null;
  objection: string | null;
};

type BriefRow = {
  id: string;
  title: string;
  body: string;
  ai_summary: string | null;
  ai_ticker: string | null;
  ai_conviction: string | null;
  ai_claims: unknown;
  ai_risks: unknown;
};

function fileFacts(body: string) {
  if (!body.startsWith("---")) {
    return { ticker: "", conviction: "" };
  }

  const end = body.indexOf("\n---", 3);

  if (end < 0) {
    return { ticker: "", conviction: "" };
  }

  const block = body.slice(3, end);
  const ticker = block.match(/^ticker:\s*["']?([^"'\n#]+)["']?\s*$/m)?.[1]?.trim() ?? "";
  const conviction = block.match(/^conviction:\s*["']?([^"'\n#]+)["']?\s*$/m)?.[1]?.trim() ?? "";
  return { ticker, conviction };
}

function asBrief(row: BriefRow): NoteBrief | null {
  if (!row.ai_summary?.trim()) {
    return null;
  }

  return {
    summary: row.ai_summary.trim(),
    ticker: row.ai_ticker?.trim() || null,
    conviction: row.ai_conviction?.trim() || null,
    claims: textList(row.ai_claims, 3),
    risks: textList(row.ai_risks, 3),
    agreement: null,
    objection: null,
  };
}

export async function generateNoteBrief(title: string, body: string): Promise<NoteBrief | null> {
  const facts = fileFacts(body);
  const json = await completeJson(
    [
      "Read this research note and return JSON with keys summary, ticker, conviction, claims, risks.",
      "summary is one paragraph of exactly five long sentences, with no list and no line breaks.",
      "ticker is the equity symbol, or an empty string.",
      "conviction is a short label such as high, medium, or low, or an empty string.",
      "claims is exactly three non-consensus claims from the note.",
      "risks is exactly three risks from the note.",
      facts.ticker ? `The file already names ticker ${facts.ticker}. Use that ticker.` : "",
      facts.conviction ? `The file already names conviction ${facts.conviction}. Use that conviction.` : "",
      `Title: ${title}`,
      body.slice(0, 14000),
    ]
      .filter(Boolean)
      .join("\n\n"),
    1800,
    { feature: "brief" }
  );

  if (!json) {
    return null;
  }

  const summary = textField(json.summary, 1600);

  if (!summary) {
    return null;
  }

  return {
    summary,
    ticker: facts.ticker || textField(json.ticker, 24) || null,
    conviction: facts.conviction || textField(json.conviction, 40) || null,
    claims: textList(json.claims, 3),
    risks: textList(json.risks, 3),
    agreement: null,
    objection: null,
  };
}

export async function ensureNoteBrief(
  postId: string,
  refresh = false,
  source?: { title: string; body: string },
  thread?: { reader?: SupabaseClient }
): Promise<NoteBrief | null> {
  const admin = createServiceClient();

  if (!admin) {
    if (!source?.body) {
      return null;
    }

    const generated = await generateNoteBrief(source.title, source.body);
    return generated ? withComments(postId, generated, thread) : null;
  }

  const { data, error } = await admin
    .from("research_posts")
    .select("id, title, body, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks")
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as BriefRow;
  const existing = asBrief(row);

  if (existing && !refresh) {
    return withComments(postId, existing, thread);
  }

  const brief = await generateNoteBrief(row.title, row.body);

  if (!brief) {
    return existing ? withComments(postId, existing, thread) : null;
  }

  await admin
    .from("research_posts")
    .update({
      ai_summary: brief.summary,
      ai_ticker: brief.ticker,
      ai_conviction: brief.conviction,
      ai_claims: brief.claims,
      ai_risks: brief.risks,
    })
    .eq("id", postId);

  return withComments(postId, brief, thread);
}

export function storedNoteBrief(row: {
  ai_summary?: string | null;
  ai_ticker?: string | null;
  ai_conviction?: string | null;
  ai_claims?: unknown;
  ai_risks?: unknown;
  ai_comment_agreement?: string | null;
  ai_comment_objection?: string | null;
}): NoteBrief | null {
  const summary = row.ai_summary?.trim();

  if (!summary) {
    return null;
  }

  return {
    summary,
    ticker: row.ai_ticker?.trim() || null,
    conviction: row.ai_conviction?.trim() || null,
    claims: textList(row.ai_claims, 3),
    risks: textList(row.ai_risks, 3),
    agreement: row.ai_comment_agreement?.trim() || null,
    objection: row.ai_comment_objection?.trim() || null,
  };
}

async function withComments(
  postId: string,
  brief: NoteBrief,
  thread?: { reader?: SupabaseClient }
): Promise<NoteBrief> {
  if (!thread) {
    return brief;
  }

  const comments = await ensureCommentBrief(postId, thread.reader);

  if (!comments) {
    return brief;
  }

  return { ...brief, agreement: comments.agreement, objection: comments.objection };
}
