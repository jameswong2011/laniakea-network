import { createServiceClient } from "@/lib/supabase/admin";
import { completeJson, textField, textList } from "@/lib/ai/openrouter";

export type NoteBrief = {
  summary: string;
  ticker: string | null;
  conviction: string | null;
  claims: string[];
  risks: string[];
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
  };
}

export async function generateNoteBrief(title: string, body: string): Promise<NoteBrief | null> {
  const facts = fileFacts(body);
  const json = await completeJson(
    [
      "Read this research note and return JSON with keys summary, ticker, conviction, claims, risks.",
      "summary is three sentences a reader can use on a tape card.",
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
    1200
  );

  if (!json) {
    return null;
  }

  const summary = textField(json.summary, 600);

  if (!summary) {
    return null;
  }

  return {
    summary,
    ticker: facts.ticker || textField(json.ticker, 24) || null,
    conviction: facts.conviction || textField(json.conviction, 40) || null,
    claims: textList(json.claims, 3),
    risks: textList(json.risks, 3),
  };
}

export async function ensureNoteBrief(postId: string, refresh = false): Promise<NoteBrief | null> {
  const admin = createServiceClient();

  if (!admin) {
    return null;
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
    return existing;
  }

  const brief = await generateNoteBrief(row.title, row.body);

  if (!brief) {
    return existing;
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

  return brief;
}
