import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
    const { data } = await supabase.auth.getUser(token);

    if (!data.user) {
      return null;
    }

    return { userId: data.user.id, supabase };
  }

  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return null;
  }

  return { userId: data.user.id, supabase };
}

export async function viewerIdFromRequest(request: Request) {
  const viewer = await viewerFromRequest(request);
  return viewer?.userId ?? null;
}
