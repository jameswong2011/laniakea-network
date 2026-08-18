"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { STARTING_HP } from "@/lib/research/economy";
import {
  isMissingInviteSchema,
  missingInviteSchemaMessage,
} from "@/lib/research/invite";
import {
  isInviteCodeFormat,
  normalizeInviteCode,
} from "@/lib/research/referral";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
};

const loginSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

const signupSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(24, "Username must be 24 characters or fewer.")
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only."),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(48, "Display name must be 48 characters or fewer."),
  inviteCode: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? normalizeInviteCode(value) : ""))
    .refine((value) => value === "" || isInviteCodeFormat(value), {
      message: "Invite code must look like LANI-XXXX-XXXX.",
    }),
});

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid form data.";
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/feed");
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    inviteCode: formData.get("inviteCode") ?? "",
  });

  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const { email, password, username, displayName, inviteCode } = parsed.data;
  const supabase = await createClient();

  if (inviteCode) {
    const preview = await supabase.rpc("preview_invite_code", {
      p_code: inviteCode,
    });

    if (preview.error && isMissingInviteSchema(preview.error.message)) {
      return { error: missingInviteSchemaMessage() };
    }

    const previewRow =
      preview.data && typeof preview.data === "object"
        ? (preview.data as { ok?: boolean })
        : null;

    if (!previewRow?.ok) {
      return { error: "Invite code is invalid or already used." };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName,
        invite_code: inviteCode || null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await supabase
      .from("profiles")
      .update({
        username,
        display_name: displayName,
        current_hp: STARTING_HP,
      })
      .eq("id", data.user.id);
  }

  if (data.session) {
    const provisioned = await supabase.rpc("finalize_signup", {
      p_invite_code: inviteCode || null,
    });

    if (provisioned.error && !isMissingInviteSchema(provisioned.error.message)) {
      return { error: provisioned.error.message.replace(/^ERROR:\s*/i, "") };
    }
  }

  if (!data.session) {
    return {
      message: inviteCode
        ? "Account created. Confirm your email before signing in. Your invite will apply on first login."
        : "Account created. Confirm your email before signing in.",
    };
  }

  redirect("/feed");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
