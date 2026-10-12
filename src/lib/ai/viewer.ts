import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { fetchRetryingFutureJwt } from "@/lib/supabase/retry-fetch";

export async function viewerIdFromRequest(request: Request) {
  const header = request.headers.get("authorization");

  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon || !token) {
      return null;
    }

    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: fetchRetryingFutureJwt,
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    const { data } = await client.auth.getUser(token);
    return data.user?.id ?? null;
  }

  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
