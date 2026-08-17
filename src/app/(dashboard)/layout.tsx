import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    <AppShell profile={profile} isAuthenticated>
      {children}
    </AppShell>
  );
}
