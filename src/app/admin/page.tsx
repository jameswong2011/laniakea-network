import type { Metadata } from "next";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { AdminProfileEditor } from "@/components/laniakea/AdminProfileEditor";
import { SeedResearchForm } from "@/components/laniakea/SeedResearchForm";
import { requireAdmin } from "@/lib/auth/session";
import type { Profile } from "@/types";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, role, tier, current_hp")
    .order("username", { ascending: true });

  const profiles = (data ?? []) as Pick<
    Profile,
    "id" | "username" | "display_name" | "role" | "tier" | "current_hp"
  >[];

  return (
    <PageFrame width="wide">
      <PageHeading
        kicker="Control"
        title="Admin"
        description="Pilot account types and seed research for demos."
      />

      <Panel>
        <PanelHeader label="Profiles" meta={profiles.length} />
        {error ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-loss">
            {error.message}
          </p>
        ) : (
          <AdminProfileEditor profiles={profiles} />
        )}
      </Panel>

      <Panel>
        <PanelHeader label="Seed Research Post" />
        <p className="border-b border-border px-2.5 py-1.5 text-[12px] text-muted-foreground">
          Inserts a post in one sub-topic and a matching HP transaction with
          type <span className="font-data text-foreground">stake</span>.
        </p>
        <SeedResearchForm authors={profiles} />
      </Panel>
    </PageFrame>
  );
}
