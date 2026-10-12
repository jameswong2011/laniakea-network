import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { wantsMeaningSearch } from "@/lib/ai/meaning-query";
import { completeJson, textList } from "@/lib/ai/openrouter";
import { readOpenNotes, type NoteRelation } from "@/lib/research/open-notes";

export { wantsMeaningSearch };

export type MeaningHit = {
  id: string;
  title: string;
  summary: string;
};

export async function rankNotesByMeaning(
  query: string,
  reader?: SupabaseClient,
  userId?: string | null
): Promise<MeaningHit[]> {
  if (!wantsMeaningSearch(query)) {
    return [];
  }

  const admin = createServiceClient();
  const db = admin ?? reader;

  if (!db) {
    return [];
  }

  const listNotes = (relation: NoteRelation) =>
    db
      .from(relation)
      .select("id, title, body, ai_summary")
      .order("created_at", { ascending: false })
      .limit(40);
  const withSummary = admin ? await listNotes("research_posts") : await readOpenNotes(listNotes);
  const listed =
    withSummary.error?.message.includes("ai_summary")
      ? await db
          .from("research_posts")
          .select("id, title, body")
          .order("created_at", { ascending: false })
          .limit(40)
      : withSummary;

  if (listed.error || !listed.data?.length) {
    return [];
  }

  const notes = (listed.data as { id: string; title: string; body?: string; ai_summary?: string | null }[])
    .map((note) => ({
      id: note.id,
      title: note.title,
      summary: note.ai_summary?.trim() || "",
    }))
    .filter((note) => note.summary);
  const json = await completeJson(
    [
      "Pick the research notes whose summaries answer the question.",
      "Return JSON with key ids, an array of note ids from the list, most relevant first, at most 8.",
      "Use only ids from the list. Return an empty array when none match.",
      `Question: ${query.trim().slice(0, 300)}`,
      notes.map((note) => `${note.id} | ${note.title} | ${note.summary}`).join("\n"),
    ].join("\n\n"),
    500,
    { feature: "search", userId }
  );
  const allowed = new Set(notes.map((note) => note.id));
  const ids = textList(json?.ids, 8).filter((id) => allowed.has(id));
  const byId = new Map(notes.map((note) => [note.id, note]));

  return ids.flatMap((id) => {
    const note = byId.get(id);
    return note ? [{ id: note.id, title: note.title, summary: note.summary }] : [];
  });
}
