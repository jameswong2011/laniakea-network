import type { Metadata } from "next";
import { PageFrame, PageHeading, Panel } from "@/components/layout/PageFrame";
import { HpReadout } from "@/components/laniakea/HpReadout";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { profile } = await requireUser();

  return (
    <PageFrame width="narrow">
      <PageHeading
        kicker="Session"
        title="Account"
        description="Identity, tier, and current Health Points."
      />

      {profile ? (
        <Panel>
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-2.5 py-2">
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-medium tracking-tight text-foreground">
                {profile.display_name}
              </h2>
              <p className="font-data text-[11px] text-muted-foreground">
                @{profile.username}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <TierBadge tier={profile.tier} size="md" />
              <span className="inline-flex h-7 items-center border border-border bg-panel-elevated px-2 font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {profile.role}
              </span>
            </div>
          </header>

          <dl className="grid grid-cols-3 divide-x divide-border">
            <div className="px-2.5 py-2.5">
              <dt className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Username
              </dt>
              <dd className="mt-1 font-data text-[13px] text-foreground">
                {profile.username}
              </dd>
            </div>
            <div className="px-2.5 py-2.5">
              <dt className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Tier
              </dt>
              <dd className="mt-1.5">
                <TierBadge tier={profile.tier} size="md" />
              </dd>
            </div>
            <div className="px-2.5 py-2.5">
              <dt className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                HP
              </dt>
              <dd className="mt-1.5">
                <HpReadout value={profile.current_hp} size="md" />
              </dd>
            </div>
          </dl>
        </Panel>
      ) : (
        <Panel className="px-2.5 py-5">
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">
            Account
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Signed in, but no profile row was found.
          </p>
        </Panel>
      )}
    </PageFrame>
  );
}
