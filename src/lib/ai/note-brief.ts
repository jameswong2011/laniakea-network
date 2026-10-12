import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { ensureCommentBrief } from "@/lib/ai/comment-brief";
import { completeJson, textField, textList } from "@/lib/ai/openrouter";
import { isMissingOpenNotes, OPEN_NOTES, type NoteRelation } from "@/lib/research/open-notes";

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
  edited_at?: string | null;
  ai_generated_at?: string | null;
  ai_brief_attempted_at?: string | null;
};

const BRIEF_COLUMNS =
  "id, title, body, edited_at, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks, ai_generated_at, ai_brief_attempted_at";
const BRIEF_COLUMNS_WITHOUT_ATTEMPT =
  "id, title, body, edited_at, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks, ai_generated_at";
const BRIEF_COLUMNS_BASE =
  "id, title, body, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks";
const ATTEMPT_GAP_MS = 2 * 60_000;

async function readBriefRow(
  client: SupabaseClient,
  postId: string,
  relation: NoteRelation = "research_posts"
): Promise<BriefRow | null> {
  const full = await client.from(relation).select(BRIEF_COLUMNS).eq("id", postId).maybeSingle();

  if (!full.error) {
    return full.data as BriefRow | null;
  }

  if (relation === OPEN_NOTES && isMissingOpenNotes(full.error)) {
    return readBriefRow(client, postId);
  }

  const withoutAttempt = await client
    .from(relation)
    .select(BRIEF_COLUMNS_WITHOUT_ATTEMPT)
    .eq("id", postId)
    .maybeSingle();

  if (!withoutAttempt.error) {
    return withoutAttempt.data as BriefRow | null;
  }

  const base = await client
    .from(relation)
    .select(BRIEF_COLUMNS_BASE)
    .eq("id", postId)
    .maybeSingle();
  return base.error ? null : (base.data as BriefRow | null);
}

function timestamp(value: string | null | undefined) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function noteBriefNeedsGeneration(row: {
  ai_summary?: string | null;
  edited_at?: string | null;
  ai_generated_at?: string | null;
}) {
  if (!row.ai_summary?.trim()) {
    return true;
  }

  const edited = timestamp(row.edited_at);
  const generated = timestamp(row.ai_generated_at);
  return edited != null && (generated == null || edited > generated);
}

function attemptedRecently(row: BriefRow) {
  const value =
    "ai_brief_attempted_at" in row ? row.ai_brief_attempted_at : row.ai_generated_at;
  const at = timestamp(value);

  if (at == null || Date.now() - at >= ATTEMPT_GAP_MS) {
    return false;
  }

  const edited = timestamp(row.edited_at);
  return edited == null || edited <= at;
}

/** One summary job per note revision: the claim lands only while the previous attempt stamp still matches. */
async function claimGeneration(admin: SupabaseClient, row: BriefRow) {
  const claimColumn =
    "ai_brief_attempted_at" in row
      ? ("ai_brief_attempted_at" as const)
      : "ai_generated_at" in row
        ? ("ai_generated_at" as const)
        : null;

  if (!claimColumn) {
    return new Date().toISOString();
  }

  if (attemptedRecently(row)) {
    return null;
  }

  const previous = row[claimColumn];
  const claimedAt = new Date().toISOString();
  const stamp = admin
    .from("research_posts")
    .update({ [claimColumn]: claimedAt })
    .eq("id", row.id);
  const claimed = await (previous
    ? stamp.eq(claimColumn, previous)
    : stamp.is(claimColumn, null)
  ).select("id");

  return !claimed.error && (claimed.data?.length ?? 0) > 0 ? claimedAt : null;
}

async function releaseLegacyClaim(admin: SupabaseClient, row: BriefRow) {
  if (!("ai_brief_attempted_at" in row) && "ai_generated_at" in row) {
    await admin
      .from("research_posts")
      .update({ ai_generated_at: row.ai_generated_at ?? null })
      .eq("id", row.id);
  }
}

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

export type BriefOptions = {
  refresh?: boolean;
  comments?: boolean;
  reader?: SupabaseClient;
  userId?: string | null;
};

export async function generateNoteBrief(
  title: string,
  body: string,
  userId?: string | null
): Promise<NoteBrief | null> {
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
    { feature: "brief", userId }
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
  options: BriefOptions = {}
): Promise<NoteBrief | null> {
  const { refresh = false, userId } = options;
  const admin = createServiceClient();

  if (!admin) {
    const note = options.reader
      ? await readBriefRow(options.reader, postId, OPEN_NOTES)
      : null;
    return note ? asBrief(note) : null;
  }

  const row = await readBriefRow(admin, postId);

  if (!row) {
    return null;
  }

  const existing = asBrief(row);

  if (existing && !refresh && !noteBriefNeedsGeneration(row)) {
    return withComments(postId, existing, options);
  }

  const claimedAt = await claimGeneration(admin, row);

  if (!claimedAt) {
    return existing ? withComments(postId, existing, options) : null;
  }

  const brief = await generateNoteBrief(row.title, row.body, userId);

  if (!brief) {
    await releaseLegacyClaim(admin, row);
    return existing ? withComments(postId, existing, options) : null;
  }

  const values: Record<string, unknown> = {
    ai_summary: brief.summary,
    ai_ticker: brief.ticker,
    ai_conviction: brief.conviction,
    ai_claims: brief.claims,
    ai_risks: brief.risks,
  };

  if ("ai_generated_at" in row) {
    values.ai_generated_at = claimedAt;
  }

  let store = admin
    .from("research_posts")
    .update(values)
    .eq("id", postId);

  if ("edited_at" in row) {
    store = row.edited_at
      ? store.eq("edited_at", row.edited_at)
      : store.is("edited_at", null);
  }

  const saved = await store.select("id");

  if (saved.error || (saved.data?.length ?? 0) === 0) {
    await releaseLegacyClaim(admin, row);
    return existing ? withComments(postId, existing, options) : null;
  }

  return withComments(postId, brief, options);
}

export function lockedBrief(brief: NoteBrief | null): NoteBrief | null {
  return brief ? { ...brief, claims: [], risks: [], agreement: null, objection: null } : null;
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
  options: BriefOptions
): Promise<NoteBrief> {
  if (!options.comments) {
    return brief;
  }

  const comments = await ensureCommentBrief(postId, options.reader, options.userId);

  if (!comments) {
    return brief;
  }

  return { ...brief, agreement: comments.agreement, objection: comments.objection };
}
