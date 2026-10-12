import { createHash } from "node:crypto";
import { prepareNoteMarkdown } from "@laniakea/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_LIMIT_MESSAGE, overAiLimit } from "@/lib/ai/limits";
import { completeJson, textField } from "@/lib/ai/openrouter";
import { readerAccess } from "@/lib/ai/viewer";
import { createServiceClient } from "@/lib/supabase/admin";

export type AskResult = {
  answer: string;
  section: string;
};

export type AskFailure = {
  error: string;
  status?: number;
};

/** The note text is part of the key, so an edit starts a fresh set of answers. */
function answerKey(mode: "full" | "summary", question: string, title: string, source: string) {
  const normalized = question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s?.!]+$/, "")
    .trim();

  return createHash("sha256").update([mode, normalized, title, source].join("\n\u0000\n")).digest("hex");
}

async function cachedAnswer(postId: string, key: string): Promise<AskResult | null> {
  const admin = createServiceClient();

  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("ai_answers")
    .select("answer, section")
    .eq("post_id", postId)
    .eq("question_key", key)
    .maybeSingle();

  return error || !data ? null : { answer: data.answer as string, section: data.section as string };
}

async function storeAnswer(postId: string, key: string, result: AskResult) {
  const admin = createServiceClient();

  if (admin) {
    await admin
      .from("ai_answers")
      .upsert(
        { post_id: postId, question_key: key, answer: result.answer, section: result.section },
        { onConflict: "post_id,question_key" }
      );
  }
}

export async function forgetAnswers(postId: string) {
  const admin = createServiceClient();

  if (admin) {
    await admin.from("ai_answers").delete().eq("post_id", postId);
  }
}

export async function askNote(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  question: string
): Promise<AskResult | AskFailure> {
  const trimmed = question.trim().slice(0, 500);

  if (trimmed.length < 2) {
    return { error: "Ask a question about this note." };
  }

  const withBrief = await supabase
    .from("research_posts")
    .select("id, author_id, title, body, ai_summary")
    .eq("id", postId)
    .maybeSingle();
  const post =
    withBrief.error?.message.includes("ai_summary")
      ? await supabase
          .from("research_posts")
          .select("id, author_id, title, body")
          .eq("id", postId)
          .maybeSingle()
      : withBrief;

  if (post.error || !post.data) {
    return { error: post.error?.message ?? "This note is not on the tape." };
  }

  const note = post.data as {
    id: string;
    author_id: string;
    title: string;
    body: string;
    ai_summary?: string | null;
  };

  const { access } = await readerAccess(supabase, userId, note);
  const locked = access === "hidden";
  const source = locked
    ? (note.ai_summary ?? "").trim()
    : prepareNoteMarkdown(note.body).slice(0, 16000);

  if (!source) {
    return { error: locked ? "This user is locked. Open it to ask about the full note." : "This note has no text yet." };
  }

  const key = answerKey(locked ? "summary" : "full", trimmed, note.title, source);
  const cached = await cachedAnswer(note.id, key);

  if (cached) {
    return cached;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return { error: "OpenRouter is not set on the server." };
  }

  if (await overAiLimit(userId, "ask")) {
    return { error: AI_LIMIT_MESSAGE, status: 429 };
  }

  const json = await completeJson(
    [
      locked
        ? "Answer only from the summary below. Do not invent the rest of the note. If the summary does not say, say so."
        : "Answer only from this research note. Name the section heading the answer comes from.",
      "Return JSON with keys answer and section.",
      "answer is two to four sentences.",
      "section is the heading, or Summary when the note is only a card.",
      `Title: ${note.title}`,
      `Question: ${trimmed}`,
      source,
    ].join("\n\n"),
    700,
    { feature: "ask", userId }
  );

  const answer = textField(json?.answer, 800);

  if (!answer) {
    return { error: "The model did not return an answer." };
  }

  const result = {
    answer,
    section: textField(json?.section, 80) || "Summary",
  };
  await storeAnswer(note.id, key, result);
  return result;
}
