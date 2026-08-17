import { AppShell } from "@/components/layout/AppShell";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();

  return (
    <AppShell profile={profile} isAuthenticated>
      {children}
    </AppShell>
  );
}
