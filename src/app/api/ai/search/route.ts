import { AI_LIMIT_MESSAGE, overAiLimit } from "@/lib/ai/limits";
import { rankNotesByMeaning, wantsMeaningSearch } from "@/lib/ai/meaning-search";
import { viewerFromRequest } from "@/lib/ai/viewer";

export async function POST(request: Request) {
  const viewer = await viewerFromRequest(request);

  if (!viewer) {
    return Response.json({ error: "Sign in to search." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = body?.query?.trim() ?? "";

  if (!wantsMeaningSearch(query)) {
    return Response.json({ hits: [] });
  }

  if (await overAiLimit(viewer.userId, "search")) {
    return Response.json({ error: AI_LIMIT_MESSAGE }, { status: 429 });
  }

  const hits = await rankNotesByMeaning(query, viewer.supabase, viewer.userId);
  return Response.json({ hits });
}
