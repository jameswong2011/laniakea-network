import { ensureCommentBrief } from "@/lib/ai/comment-brief";
import { AI_LIMIT_MESSAGE, overAiLimit } from "@/lib/ai/limits";
import { readerAccess, viewerFromRequest } from "@/lib/ai/viewer";

export async function POST(request: Request) {
  const viewer = await viewerFromRequest(request);

  if (!viewer) {
    return Response.json({ error: "Sign in to read the thread." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { postId?: string } | null;
  const postId = body?.postId?.trim() ?? "";

  if (!postId) {
    return Response.json({ error: "Missing note." }, { status: 400 });
  }

  const { data: note } = await viewer.supabase
    .from("research_posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!note) {
    return Response.json({ brief: null });
  }

  const { access } = await readerAccess(viewer.supabase, viewer.userId, note);

  if (access === "hidden") {
    return Response.json({ brief: null });
  }

  if (await overAiLimit(viewer.userId, "comments")) {
    return Response.json({ error: AI_LIMIT_MESSAGE }, { status: 429 });
  }

  const brief = await ensureCommentBrief(postId, viewer.supabase, viewer.userId);
  return Response.json({ brief });
}
