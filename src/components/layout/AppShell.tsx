import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { loadNotifications, type NotificationRow } from "@/lib/research/forum";
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
  let notifications: NotificationRow[] = [];
  let unreadCount = 0;

  if (isAuthenticated && profile?.id) {
    const supabase = await createClient();
    const [topics, inbox] = await Promise.all([
      getEngagedTopics(supabase, profile.id),
      loadNotifications(supabase, profile.id),
    ]);
    engagedTopics = topics;
    notifications = inbox.items;
    unreadCount = inbox.unread;
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <AppHeader
        profile={profile}
        isAuthenticated={isAuthenticated}
        engagedTopics={engagedTopics}
        notifications={notifications}
        unreadCount={unreadCount}
      />
      <main className="min-h-0 flex-1 bg-background">{children}</main>
    </div>
  );
}
