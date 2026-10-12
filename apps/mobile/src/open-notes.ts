export const OPEN_NOTES = "research_posts_open";

export type NoteRelation = typeof OPEN_NOTES | "research_posts";

type ReadError = { code?: string; message: string } | null;

export function isMissingOpenNotes(error: ReadError) {
  return Boolean(error && (error.code === "PGRST205" || error.code === "42P01"));
}

export function isMissingFunction(error: ReadError) {
  return Boolean(error && (error.code === "PGRST202" || error.code === "42883"));
}

/** Note text reads go through the view, which shows an excerpt of notes the reader cannot open. The table is read only while the view is absent. */
export async function readOpenNotes<T extends { error: ReadError }>(
  run: (relation: NoteRelation) => PromiseLike<T>
): Promise<T> {
  const viaView = await run(OPEN_NOTES);
  return isMissingOpenNotes(viaView.error) ? run("research_posts") : viaView;
}
