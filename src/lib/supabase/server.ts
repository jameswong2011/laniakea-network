import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { fetchRetryingFutureJwt } from "@/lib/supabase/retry-fetch";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: fetchRetryingFutureJwt,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component, which cannot write cookies.
            // Session refresh is handled by Proxy / middleware.
          }
        },
      },
    }
  );
}
