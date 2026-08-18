import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getEngagedTopics } from "@/lib/research/subtopic-ranks";
import type { Profile, SubTopic } from "@/types";

type AppShellProps = {
  children: ReactNode;
  profile?: Profile | null;
  isAuthenticated?: boolean;
};

export async function AppShell({
  children,
  profile = null,
  isAuthenticated = false,
}: AppShellProps) {
  let engagedTopics: SubTopic[] = [];

  if (isAuthenticated && profile?.id) {
    const supabase = await createClient();
    engagedTopics = await getEngagedTopics(supabase, profile.id);
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <AppHeader
        profile={profile}
        isAuthenticated={isAuthenticated}
        engagedTopics={engagedTopics}
      />
      <main className="min-h-0 flex-1 bg-background">{children}</main>
    </div>
  );
}
