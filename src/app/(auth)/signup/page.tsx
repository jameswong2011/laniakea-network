import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageFrame, PageHeading, Panel } from "@/components/layout/PageFrame";
import { AuthForm } from "@/components/laniakea/AuthForm";
import { createClient } from "@/lib/supabase/server";
import {
  isInviteCodeFormat,
  normalizeInviteCode,
} from "@/lib/research/referral";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  const rawCode = (await searchParams).code;
  const inviteCode =
    typeof rawCode === "string" && isInviteCodeFormat(rawCode)
      ? normalizeInviteCode(rawCode)
      : "";

  let preview: { ok?: boolean; tier?: string; displayName?: string } | null =
    null;

  if (inviteCode) {
    const { data: previewData } = await supabase.rpc("preview_invite_code", {
      p_code: inviteCode,
    });
    preview =
      previewData && typeof previewData === "object"
        ? (previewData as { ok?: boolean; tier?: string; displayName?: string })
        : null;
  }

  return (
    <PageFrame width="form">
      <PageHeading
        kicker="Access"
        title="Create account"
        description={
          preview?.ok
            ? `Invite from ${preview.displayName ?? "a desk"}. You start at ${preview.tier ?? "their"} tier.`
            : "Public signup starts Bronze. Paste an invite to start on the inviter’s desk."
        }
      />
      <Panel className="p-2.5">
        <AuthForm mode="signup" inviteCode={inviteCode} />
      </Panel>
    </PageFrame>
  );
}
