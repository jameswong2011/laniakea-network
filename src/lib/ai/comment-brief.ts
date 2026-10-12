import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { completeJson, textField } from "@/lib/ai/openrouter";

export type CommentBrief = {
  agreement: string;
  objection: string;
};

const MIN_COMMENTS = 3;

export async function ensureCommentBrief(
  postId: string,
  reader?: SupabaseClient
): Promise<CommentBrief | null> {
  const admin = createServiceClient();
  const db = admin ?? reader;

  if (!db) {
    return null;
  }

  const [post, comments] = await Promise.all([
    db
      .from("research_posts")
      .select("ai_comment_agreement, ai_comment_objection, ai_comment_ids")
      .eq("id", postId)
      .maybeSingle(),
    db
      .from("research_comments")
      .select("id, body")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
  ]);

  if (comments.error) {
    return null;
  }

  const rows = (comments.data ?? []) as { id: string; body: string }[];

  if (rows.length < MIN_COMMENTS) {
    return null;
  }

  const ids = rows.map((row) => row.id).sort();
  const cached = post.error ? null : post.data;
  const stored = [...((cached?.ai_comment_ids as string[] | null) ?? [])].sort();
  const agreement = textField(cached?.ai_comment_agreement, 400);
  const objection = textField(cached?.ai_comment_objection, 400);

  if (agreement && objection && stored.join() === ids.join()) {
    return { agreement, objection };
  }

  const json = await completeJson(
    [
      "Summarize these staked comments on a research note.",
      "Return JSON with keys agreement and objection.",
      "agreement is one or two sentences on what the comments support.",
      "objection is one or two sentences on what they challenge.",
      "If one side is missing, say that plainly.",
      rows
        .map((row, index) => `${index + 1}. ${row.body.slice(0, 700)}`)
        .join("\n\n"),
    ].join("\n\n"),
    700,
    { feature: "comments" }
  );

  if (!json) {
    return agreement && objection ? { agreement, objection } : null;
  }

  const next = {
    agreement: textField(json.agreement, 400),
    objection: textField(json.objection, 400),
  };

  if (!next.agreement || !next.objection) {
    return null;
  }

  if (admin) {
    await admin
      .from("research_posts")
      .update({
        ai_comment_agreement: next.agreement,
        ai_comment_objection: next.objection,
        ai_comment_ids: ids,
      })
      .eq("id", postId);
  }

  return next;
}
