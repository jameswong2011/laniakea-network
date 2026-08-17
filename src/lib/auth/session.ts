import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

const PROFILE_COLUMNS =
  "id, username, display_name, role, tier, current_hp, utility_tokens, created_at, updated_at";

const PROFILE_COLUMNS_LEGACY =
  "id, username, display_name, role, tier, current_hp, created_at, updated_at";

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string | null;
  profile: Profile | null;
};

export type AuthenticatedContext = AuthContext & {
  userId: string;
};

function asProfile(
  row: Omit<Profile, "utility_tokens"> & { utility_tokens?: number | null }
): Profile {
  return {
    ...row,
    utility_tokens: row.utility_tokens ?? 0,
  };
}

async function loadProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Profile | null> {
  const withTokens = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (!withTokens.error) {
    return withTokens.data
      ? asProfile(withTokens.data as Omit<Profile, "utility_tokens"> & {
          utility_tokens?: number | null;
        })
      : null;
  }

  if (!withTokens.error.message.includes("utility_tokens")) {
    return null;
  }

  const legacy = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS_LEGACY)
    .eq("id", userId)
    .maybeSingle();

  return legacy.data
    ? asProfile(legacy.data as Omit<Profile, "utility_tokens">)
    : null;
}

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (typeof userId !== "string") {
    return { supabase, userId: null, profile: null };
  }

  return {
    supabase,
    userId,
    profile: await loadProfile(supabase, userId),
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
