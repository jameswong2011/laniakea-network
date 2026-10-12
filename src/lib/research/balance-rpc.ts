import type { SupabaseClient } from "@supabase/supabase-js";

export type BalanceReceipt = {
  id?: string;
  postId?: string;
  postAuthorId?: string;
  outcome?: "live" | "hunt" | "ascent";
  hp?: number;
  currentHp?: number;
  utilityTokens?: number;
  message?: string;
  error?: string | null;
};

export type BalanceCall =
  | { missing: true }
  | { error: string }
  | { receipt: BalanceReceipt };

/** Falls through to the older code path only while the SQL function is absent from the database. */
export async function callBalanceFunction(
  supabase: SupabaseClient,
  name: string,
  args: Record<string, unknown>
): Promise<BalanceCall> {
  const { data, error } = await supabase.rpc(name, args);

  if (error) {
    if (error.code === "PGRST202" || (error.code === "42883" && error.message.includes(name))) {
      return { missing: true };
    }

    return {
      error: error.message.replace(/^ERROR:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/, ""),
    };
  }

  return { receipt: (data ?? {}) as BalanceReceipt };
}
