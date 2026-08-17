import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

const PROFILE_COLUMNS =
  "id, username, display_name, role, tier, current_hp, created_at, updated_at";

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string | null;
  profile: Profile | null;
};

export type AuthenticatedContext = AuthContext & {
  userId: string;
};

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (typeof userId !== "string") {
    return { supabase, userId: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  return {
    supabase,
    userId,
    profile: profile as Profile | null,
  };
});

export async function requireUser(): Promise<AuthenticatedContext> {
  const context = await getAuthContext();

  if (!context.userId) {
    redirect("/login");
  }

  return context as AuthenticatedContext;
}

export async function requireAdmin(): Promise<AuthenticatedContext> {
  const context = await requireUser();

  if (context.profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return context;
}
