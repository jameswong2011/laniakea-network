import { createClient } from "@supabase/supabase-js";
import { fetchRetryingFutureJwt } from "@/lib/supabase/retry-fetch";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetchRetryingFutureJwt,
    },
  });
}
