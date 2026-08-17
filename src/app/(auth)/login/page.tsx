import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageFrame, PageHeading, Panel } from "@/components/layout/PageFrame";
import { AuthForm } from "@/components/laniakea/AuthForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return (
    <PageFrame width="form">
      <PageHeading
        kicker="Access"
        title="Sign in"
        description="Enter the research terminal with your account credentials."
      />
      <Panel className="p-2.5">
        <AuthForm mode="login" />
      </Panel>
    </PageFrame>
  );
}
