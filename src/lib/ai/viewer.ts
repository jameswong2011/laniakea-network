import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DeskAccess } from "@/lib/research/access";
import { resolvePostDeskAccess } from "@/lib/research/unlock";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { fetchRetryingFutureJwt } from "@/lib/supabase/retry-fetch";

export async function viewerFromRequest(request: Request): Promise<{
  userId: string;
  supabase: SupabaseClient;
} | null> {
  const header = request.headers.get("authorization");

  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon || !token) {
      return null;
    }

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: fetchRetryingFutureJwt,
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    const { data } = await supabase.auth.getClaims(token);
    const userId = data?.claims.sub;

    if (!userId) {
      return null;
    }

    return { userId, supabase };
  }

  const supabase = await createServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (!userId) {
    return null;
  }

  return { userId, supabase };
}

export async function viewerIdFromRequest(request: Request) {
  const viewer = await viewerFromRequest(request);
  return viewer?.userId ?? null;
}

export async function readerAccess(
  supabase: SupabaseClient,
  userId: string,
  note: { id: string; author_id: string }
): Promise<{ access: DeskAccess; isAdmin: boolean }> {
  const [viewer, author] = await Promise.all([
    supabase.from("profiles").select("tier, role").eq("id", userId).maybeSingle(),
    supabase.from("profiles").select("tier").eq("id", note.author_id).maybeSingle(),
  ]);
  const isAdmin = viewer.data?.role === "admin";

  if (note.author_id === userId) {
    return { access: "full", isAdmin };
  }

  const access = await resolvePostDeskAccess(supabase, {
    postId: note.id,
    viewerId: userId,
    viewerTier: viewer.data?.tier,
    authorTier: author.data?.tier,
    isAdmin,
  });
  return { access, isAdmin };
}
