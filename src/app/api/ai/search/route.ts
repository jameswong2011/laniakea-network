import { rankNotesByMeaning, wantsMeaningSearch } from "@/lib/ai/meaning-search";
import { viewerIdFromRequest } from "@/lib/ai/viewer";

export async function POST(request: Request) {
  const userId = await viewerIdFromRequest(request);

  if (!userId) {
    return Response.json({ error: "Sign in to search." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = body?.query?.trim() ?? "";

  if (!wantsMeaningSearch(query)) {
    return Response.json({ hits: [] });
  }

  const hits = await rankNotesByMeaning(query);
  return Response.json({ hits });
}
