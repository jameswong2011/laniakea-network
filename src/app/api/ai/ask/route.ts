import { askNote } from "@/lib/ai/ask-note";
import { AI_LIMIT_MESSAGE, overAiLimit } from "@/lib/ai/limits";
import { viewerFromRequest } from "@/lib/ai/viewer";

export async function POST(request: Request) {
  const viewer = await viewerFromRequest(request);

  if (!viewer) {
    return Response.json({ error: "Sign in to ask this note." }, { status: 401 });
  }

  if (await overAiLimit(viewer.userId, "ask")) {
    return Response.json({ error: AI_LIMIT_MESSAGE }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { postId?: string; question?: string } | null;
  const result = await askNote(
    viewer.supabase,
    viewer.userId,
    body?.postId?.trim() ?? "",
    body?.question ?? ""
  );

  if ("error" in result) {
    return Response.json(result, { status: 400 });
  }

  return Response.json(result);
}
