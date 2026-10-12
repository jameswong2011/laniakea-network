import { prepareNoteMarkdown } from "@laniakea/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { completeJson, textField } from "@/lib/ai/openrouter";
import { readerAccess } from "@/lib/ai/viewer";

export type AskResult = {
  answer: string;
  section: string;
};

export async function askNote(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  question: string
): Promise<AskResult | { error: string }> {
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

  if (!process.env.OPENROUTER_API_KEY) {
    return { error: "OpenRouter is not set on the server." };
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

  return {
    answer,
    section: textField(json?.section, 80) || "Summary",
  };
}
