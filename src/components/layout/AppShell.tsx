import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import type { Profile } from "@/types";

type AppShellProps = {
  children: ReactNode;
  profile?: Profile | null;
  isAuthenticated?: boolean;
};

export function AppShell({
  children,
  profile = null,
  isAuthenticated = false,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <AppHeader profile={profile} isAuthenticated={isAuthenticated} />
      <main className="min-h-0 flex-1 bg-background">{children}</main>
    </div>
  );
}
