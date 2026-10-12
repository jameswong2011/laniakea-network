import { ensureCommentBrief } from "@/lib/ai/comment-brief";
import { viewerIdFromRequest } from "@/lib/ai/viewer";

export async function POST(request: Request) {
  const userId = await viewerIdFromRequest(request);

  if (!userId) {
    return Response.json({ error: "Sign in to read the thread." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { postId?: string } | null;
  const postId = body?.postId?.trim() ?? "";

  if (!postId) {
    return Response.json({ error: "Missing note." }, { status: 400 });
  }

  const brief = await ensureCommentBrief(postId);
  return Response.json({ brief });
}
