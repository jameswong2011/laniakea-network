import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageFrame, PageHeading, Panel } from "@/components/layout/PageFrame";
import { AuthForm } from "@/components/laniakea/AuthForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignupPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return (
    <PageFrame width="form">
      <PageHeading
        kicker="Access"
        title="Create account"
        description="Register a research identity. New accounts start in Bronze."
      />
      <Panel className="p-2.5">
        <AuthForm mode="signup" />
      </Panel>
    </PageFrame>
  );
}
