import { AI_LIMIT_MESSAGE, overAiLimit } from "@/lib/ai/limits";
import { ensureNoteBrief, lockedBrief, storedNoteBrief } from "@/lib/ai/note-brief";
import { readerAccess, viewerFromRequest } from "@/lib/ai/viewer";

const STORED_COLUMNS =
  "author_id, title, body, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks, ai_comment_agreement, ai_comment_objection";
const STORED_COLUMNS_WITHOUT_COMMENTS =
  "author_id, title, body, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks";

export async function POST(request: Request) {
  const viewer = await viewerFromRequest(request);

  if (!viewer) {
    return Response.json({ error: "Sign in to brief this note." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { postId?: string; refresh?: boolean }
    | null;
  const postId = body?.postId?.trim() ?? "";

  if (!postId) {
    return Response.json({ error: "Missing note." }, { status: 400 });
  }

  const withComments = await viewer.supabase
    .from("research_posts")
    .select(STORED_COLUMNS)
    .eq("id", postId)
    .maybeSingle();
  const read =
    withComments.error?.message.includes("ai_comment")
      ? await viewer.supabase
          .from("research_posts")
          .select(STORED_COLUMNS_WITHOUT_COMMENTS)
          .eq("id", postId)
          .maybeSingle()
      : withComments;

  if (!read.data) {
    return Response.json({ brief: null });
  }

  const note = read.data as { author_id: string; title: string; body: string };
  const { access, isAdmin } = await readerAccess(viewer.supabase, viewer.userId, {
    id: postId,
    author_id: note.author_id,
  });

  if (!body?.refresh) {
    const stored = storedNoteBrief(read.data);
    return Response.json({ brief: access === "hidden" ? lockedBrief(stored) : stored });
  }

  if (note.author_id !== viewer.userId && !isAdmin) {
    return Response.json({ error: "Only the author can refresh this summary." }, { status: 403 });
  }

  if (await overAiLimit(viewer.userId, "brief")) {
    return Response.json({ error: AI_LIMIT_MESSAGE }, { status: 429 });
  }

  const brief = await ensureNoteBrief(postId, {
    refresh: true,
    source: { title: note.title, body: note.body },
    comments: true,
    reader: viewer.supabase,
    userId: viewer.userId,
  });

  if (!brief) {
    return Response.json({ error: "No brief yet. Add OPENROUTER_API_KEY and run the note AI SQL." }, { status: 503 });
  }

  return Response.json({ brief });
}
