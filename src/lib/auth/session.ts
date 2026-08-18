import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMissingInviteSchema } from "@/lib/research/invite";
import type { Profile, RegistrationPath } from "@/types";

const PROFILE_COLUMNS =
  "id, username, display_name, role, tier, current_hp, utility_tokens, invited_by, account_code, registration_path, is_system, bio, avatar_url, created_at, updated_at";

const PROFILE_COLUMNS_TOKENS =
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

type ProfileRow = Omit<
  Profile,
  | "utility_tokens"
  | "invited_by"
  | "account_code"
  | "registration_path"
  | "is_system"
  | "bio"
  | "avatar_url"
> & {
  utility_tokens?: number | null;
  invited_by?: string | null;
  account_code?: string | null;
  registration_path?: string | null;
  is_system?: boolean | null;
  bio?: string | null;
  avatar_url?: string | null;
};

function asProfile(row: ProfileRow): Profile {
  const path: RegistrationPath =
    row.registration_path === "invite" ? "invite" : "public";

  return {
    ...row,
    utility_tokens: row.utility_tokens ?? 0,
    invited_by: row.invited_by ?? null,
    account_code: row.account_code ?? null,
    registration_path: path,
    is_system: row.is_system ?? false,
    bio: row.bio ?? null,
    avatar_url: row.avatar_url ?? null,
  };
}

async function loadProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Profile | null> {
  const withInvite = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (!withInvite.error) {
    return withInvite.data ? asProfile(withInvite.data as ProfileRow) : null;
  }

  if (
    withInvite.error.message.includes("avatar_url") ||
    withInvite.error.message.includes("bio")
  ) {
    const withoutAvatar = withInvite.error.message.includes("avatar_url")
      ? await supabase
          .from("profiles")
          .select(
            "id, username, display_name, role, tier, current_hp, utility_tokens, invited_by, account_code, registration_path, is_system, bio, created_at, updated_at"
          )
          .eq("id", userId)
          .maybeSingle()
      : withInvite;

    if (!withoutAvatar.error) {
      return withoutAvatar.data
        ? asProfile(withoutAvatar.data as ProfileRow)
        : null;
    }

    const withoutBio = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, role, tier, current_hp, utility_tokens, invited_by, account_code, registration_path, is_system, created_at, updated_at"
      )
      .eq("id", userId)
      .maybeSingle();

    if (!withoutBio.error) {
      return withoutBio.data ? asProfile(withoutBio.data as ProfileRow) : null;
    }
  }

  const withTokens = withInvite.error.message.includes("invited_by")
    || withInvite.error.message.includes("account_code")
    || withInvite.error.message.includes("registration_path")
    || withInvite.error.message.includes("is_system")
    ? await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS_TOKENS)
        .eq("id", userId)
        .maybeSingle()
    : withInvite;

  if (!withTokens.error) {
    return withTokens.data ? asProfile(withTokens.data as ProfileRow) : null;
  }

  if (!withTokens.error.message.includes("utility_tokens")) {
    return null;
  }

  const legacy = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS_LEGACY)
    .eq("id", userId)
    .maybeSingle();

  return legacy.data ? asProfile(legacy.data as ProfileRow) : null;
}

async function provisionInviteDesk(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Profile | null
) {
  if (!profile || profile.account_code) {
    return profile;
  }

  const { error } = await supabase.rpc("finalize_signup", {
    p_invite_code: null,
  });

  if (error && !isMissingInviteSchema(error.message)) {
    return profile;
  }

  if (error) {
    return profile;
  }

  return (await loadProfile(supabase, profile.id)) ?? profile;
}

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (typeof userId !== "string") {
    return { supabase, userId: null, profile: null };
  }

  const profile = await provisionInviteDesk(
    supabase,
    await loadProfile(supabase, userId)
  );

  return { supabase, userId, profile };
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
