import { ensureNoteBrief } from "@/lib/ai/note-brief";
import { viewerFromRequest } from "@/lib/ai/viewer";

export async function POST(request: Request) {
  const viewer = await viewerFromRequest(request);

  if (!viewer) {
    return Response.json({ error: "Sign in to brief this note." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { postId?: string; refresh?: boolean } | null;
  const postId = body?.postId?.trim() ?? "";

  if (!postId) {
    return Response.json({ error: "Missing note." }, { status: 400 });
  }

  const read = await viewer.supabase
    .from("research_posts")
    .select("title, body")
    .eq("id", postId)
    .maybeSingle();
  const brief = await ensureNoteBrief(
    postId,
    Boolean(body?.refresh),
    read.data ? { title: read.data.title as string, body: read.data.body as string } : undefined
  );

  if (!brief) {
    return Response.json({ error: "No brief yet. Add OPENROUTER_API_KEY and run the note AI SQL." }, { status: 503 });
  }

  return Response.json({ brief });
}
