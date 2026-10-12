import { prepareNoteMarkdown } from "@laniakea/domain";
import { getDeskAccess } from "@/lib/research/access";
import { withPaidUnlock } from "@/lib/research/unlock";
import { createServiceClient } from "@/lib/supabase/admin";
import { completeJson, textField, textList } from "@/lib/ai/openrouter";

export type AskResult = {
  answer: string;
  section: string;
};

export async function askNote(userId: string, postId: string, question: string): Promise<AskResult | { error: string }> {
  const trimmed = question.trim().slice(0, 500);

  if (trimmed.length < 2) {
    return { error: "Ask a question about this note." };
  }

  const admin = createServiceClient();

  if (!admin) {
    return { error: "The server cannot read this note yet." };
  }

  const post = await admin
    .from("research_posts")
    .select("id, author_id, title, body, ai_summary, ai_claims, ai_risks")
    .eq("id", postId)
    .maybeSingle();

  if (post.error || !post.data) {
    return { error: "This note is not on the tape." };
  }

  const [viewer, author, unlock] = await Promise.all([
    admin.from("profiles").select("tier, role").eq("id", userId).maybeSingle(),
    admin.from("profiles").select("tier").eq("id", post.data.author_id).maybeSingle(),
    admin
      .from("post_unlocks")
      .select("post_id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle(),
  ]);
  const ownsNote = userId === post.data.author_id;
  const access = ownsNote
    ? "full"
    : withPaidUnlock(
        getDeskAccess(viewer.data?.tier, author.data?.tier, viewer.data?.role === "admin"),
        Boolean(unlock.data)
      );
  const locked = access === "hidden";
  const source = locked
    ? [
        post.data.ai_summary ?? "",
        ...textList(post.data.ai_claims, 3).map((claim) => `Claim: ${claim}`),
        ...textList(post.data.ai_risks, 3).map((risk) => `Risk: ${risk}`),
      ]
        .filter(Boolean)
        .join("\n")
    : prepareNoteMarkdown(post.data.body as string).slice(0, 16000);

  if (!source) {
    return { error: locked ? "This desk is locked. Open it to ask about the full note." : "This note has no text yet." };
  }

  const json = await completeJson(
    [
      locked
        ? "Answer only from the summary below. Do not invent the rest of the note. If the summary does not say, say so."
        : "Answer only from this research note. Name the section heading the answer comes from.",
      "Return JSON with keys answer and section.",
      "answer is two to four sentences.",
      "section is the heading, or Summary when the note is only a card.",
      `Title: ${post.data.title}`,
      `Question: ${trimmed}`,
      source,
    ].join("\n\n"),
    700
  );

  const answer = textField(json?.answer, 800);

  if (!answer) {
    return { error: "No answer came back." };
  }

  return {
    answer,
    section: textField(json?.section, 80) || "Summary",
  };
}
