import { ensureNoteBrief, storedNoteBrief } from "@/lib/ai/note-brief";
import { viewerFromRequest } from "@/lib/ai/viewer";

const STORED_COLUMNS =
  "title, body, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks, ai_comment_agreement, ai_comment_objection";
const STORED_COLUMNS_WITHOUT_COMMENTS =
  "title, body, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks";

export async function POST(request: Request) {
  const viewer = await viewerFromRequest(request);

  if (!viewer) {
    return Response.json({ error: "Sign in to brief this note." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { postId?: string; refresh?: boolean; locked?: boolean }
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

  if (!body?.refresh) {
    return Response.json({ brief: read.data ? storedNoteBrief(read.data) : null });
  }

  const brief = await ensureNoteBrief(
    postId,
    true,
    read.data ? { title: read.data.title as string, body: read.data.body as string } : undefined,
    body.locked ? undefined : { reader: viewer.supabase }
  );

  if (!brief) {
    return Response.json({ error: "No brief yet. Add OPENROUTER_API_KEY and run the note AI SQL." }, { status: 503 });
  }

  return Response.json({ brief });
}
