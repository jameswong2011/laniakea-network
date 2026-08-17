import type { Metadata } from "next";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { AdminProfileEditor } from "@/components/laniakea/AdminProfileEditor";
import { PassiveDrainButton } from "@/components/laniakea/PassiveDrainButton";
import { SeedDemoDataButton } from "@/components/laniakea/SeedDemoDataButton";
import { SeedResearchForm } from "@/components/laniakea/SeedResearchForm";
import { PASSIVE_DRAIN_HP } from "@/lib/research/economy";
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
        <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-2.5 py-1.5">
          <div>
            <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Seed Demo Data
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Creates 15 demo desks across all tiers, 22 research posts across
              every sub-topic, matching HP ledger rows, and a sample of votes.
              Re-running refreshes the demo users and skips titles that already
              exist. Your admin role is left alone; a few of the new posts are
              voted from this desk so Wallet is not empty.
            </p>
          </div>
          <SeedDemoDataButton />
        </div>
      </Panel>

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
        <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-2.5 py-1.5">
          <div>
            <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Passive HP Drain
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Deducts up to {PASSIVE_DRAIN_HP} HP from every non-admin account
              with a positive balance and writes a{" "}
              <span className="font-data text-foreground">drain</span> ledger
              row.
            </p>
          </div>
          <PassiveDrainButton />
        </div>
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
