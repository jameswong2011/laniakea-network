import type { Metadata } from "next";
import { AdminNav } from "@/components/laniakea/AdminNav";
import { InviteTree } from "@/components/laniakea/InviteTree";
import { PageFrame, PageHeading, Panel, PanelHeader } from "@/components/layout/PageFrame";
import { loadAdminMetrics } from "@/lib/admin/metrics";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin invites" };

export default async function AdminInvitesPage() {
  const { supabase } = await requireAdmin();
  const metrics = await loadAdminMetrics(supabase);
  const paid = metrics.people.reduce((sum, person) => sum + person.referralUtl, 0);

  return (
    <PageFrame width="wide">
      <PageHeading
        kicker="Superuser"
        title="Invite economics"
        description="Each line is a user who invited someone, then the people under them. UTL is residual already paid to that user."
      />
      <AdminNav current="/admin/invites" />
      <Panel>
        <PanelHeader label="Paid residual" meta={`${paid} UTL`} />
        <InviteTree nodes={metrics.tree} />
      </Panel>
    </PageFrame>
  );
}
