import { createBrowserClient } from "@supabase/ssr";
import { fetchRetryingFutureJwt } from "@/lib/supabase/retry-fetch";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: fetchRetryingFutureJwt,
      },
    }
  );
}
