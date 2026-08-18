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
import { WeeklyMaintenanceButton } from "@/components/laniakea/WeeklyMaintenanceButton";
import { DEMO_POSTS, DEMO_USERS } from "@/lib/research/demo-catalog";
import { DEMO_SEED_WRITE_SQL } from "@/lib/research/demo-sql";
import {
  PASSIVE_DRAIN_HP,
  WEEKLY_CRON_LABEL,
} from "@/lib/research/economy";
import {
  COMMENTS_SQL_POLICIES,
  COMMENTS_SQL_TABLES,
} from "@/lib/research/comments-sql";
import { SETTLEMENT_SQL } from "@/lib/research/settlement-sql";
import { weeklyMaintenanceSql } from "@/lib/research/weekly-sql";
import { getLatestWeeklyRun } from "@/lib/research/weekly";
import { requireAdmin } from "@/lib/auth/session";
import { resolveTier, type Profile } from "@/types";
import { format } from "date-fns";

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

  const demoUsernames = new Set(DEMO_USERS.map((user) => user.username));
  const demoProfiles = profiles.filter((profile) =>
    demoUsernames.has(profile.username)
  );
  const demoStillBronze =
    demoProfiles.length > 0 &&
    demoProfiles.every((profile) => resolveTier(profile.tier) === "Bronze");

  const weekly = await getLatestWeeklyRun(supabase);
  const stakeProbe = await supabase
    .from("research_posts")
    .select("original_stake")
    .limit(1);
  const settlementReady = !stakeProbe.error;
  const commentsProbe = await supabase
    .from("research_comments")
    .select("id")
    .limit(1);
  const commentsReady = !commentsProbe.error;

  const { data: livePosts } = await supabase
    .from("research_posts")
    .select("id, title, author_id");

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const catalogByTitle = new Map(DEMO_POSTS.map((post) => [post.title, post]));
  const catalogPosts = (livePosts ?? []).filter((post) =>
    catalogByTitle.has(post.title)
  );
  const matchedPosts = catalogPosts.filter((post) => {
    const expected = catalogByTitle.get(post.title);
    const author = profileById.get(post.author_id);
    return Boolean(expected && author?.username === expected.authorUsername);
  });

  return (
    <PageFrame width="wide">
      <PageHeading
        kicker="Control"
        title="Admin"
        description="Seed a full demo book, then adjust desks and single posts if needed."
      />

      <Panel>
        <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-2.5 py-1.5">
          <div>
            <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Seed Demo Data
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Inserts {DEMO_USERS.length} demo desks (4 per tier) and{" "}
              {DEMO_POSTS.length} hard-coded research notes across every
              sub-topic, plus matching HP ledger rows and sample votes. No
              manual posting and no external model calls. Re-running refreshes
              demo users and skips titles that already exist. Your admin role
              is left alone; this desk votes on a subset so Wallet is not empty.
            </p>
            <p className="mt-1.5 font-data text-[10px] text-muted-foreground">
              Demo desks {demoProfiles.length}/{DEMO_USERS.length}
              {" · "}
              catalog notes linked to the intended author {matchedPosts.length}/
              {DEMO_POSTS.length}
            </p>
            {demoStillBronze ? (
              <p className="mt-1.5 text-[12px] text-warning">
                Demo desks are still Bronze. Signup created them with the
                default tier; RLS blocked the catalog write. Run the SQL below
                once, then click Seed Demo Data again.
              </p>
            ) : null}
          </div>
          <SeedDemoDataButton />
        </div>
        {demoStillBronze ? (
          <pre className="max-h-48 overflow-auto border-t border-border bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
            {DEMO_SEED_WRITE_SQL}
          </pre>
        ) : null}
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
              Weekly Jobs
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Every {WEEKLY_CRON_LABEL}: drain {PASSIVE_DRAIN_HP} HP from
              non-admin desks, then promote / demote the top and bottom
              quartile. Manual buttons below still work. Last run{" "}
              {weekly.run
                ? `${format(new Date(weekly.run.ran_at), "MMM d HH:mm")} (${weekly.run.source})`
                : "not recorded"}
              .
            </p>
            {weekly.missingTable ? (
              <p className="mt-1.5 text-[12px] text-warning">
                Run the weekly SQL once so the database cron is armed. Vercel
                also hits /api/cron/weekly if CRON_SECRET and the service role
                key are set.
              </p>
            ) : null}
          </div>
          <WeeklyMaintenanceButton />
        </div>
        {weekly.missingTable ? (
          <pre className="max-h-48 overflow-auto border-t border-border bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
            {weeklyMaintenanceSql()}
          </pre>
        ) : null}
      </Panel>

      {settlementReady ? null : (
        <Panel>
          <PanelHeader label="Settlement schema" meta="required" />
          <p className="border-b border-border px-2.5 py-1.5 text-[12px] text-warning">
            Hunt and ascent payouts need original_stake, health_at_vote, and
            hunt/ascent ledger types. Run this once.
          </p>
          <pre className="max-h-48 overflow-auto bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
            {SETTLEMENT_SQL}
          </pre>
        </Panel>
      )}

      {commentsReady ? null : (
        <Panel>
          <PanelHeader label="Comments schema" meta="required" />
          <p className="border-b border-border px-2.5 py-1.5 text-[12px] text-warning">
            Run part 1, then part 2, as two separate queries. One combined
            script can deadlock against live wallet reads.
          </p>
          <pre className="max-h-40 overflow-auto bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
            {COMMENTS_SQL_TABLES}
          </pre>
          <pre className="max-h-40 overflow-auto border-t border-border bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
            {COMMENTS_SQL_POLICIES}
          </pre>
        </Panel>
      )}

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
              row. This is the same {PASSIVE_DRAIN_HP} HP tax the weekly job
              applies.
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
