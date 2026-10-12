import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { AdminNav } from "@/components/laniakea/AdminNav";
import { AdminProfileEditor } from "@/components/laniakea/AdminProfileEditor";
import { PassiveDrainButton } from "@/components/laniakea/PassiveDrainButton";
import { SeedDemoDataButton } from "@/components/laniakea/SeedDemoDataButton";
import { SeedResearchForm } from "@/components/laniakea/SeedResearchForm";
import { WipeForumButton } from "@/components/laniakea/WipeForumButton";
import { CopyInviteButton } from "@/components/laniakea/CopyInviteButton";
import { WeeklyMaintenanceButton } from "@/components/laniakea/WeeklyMaintenanceButton";
import { DEMO_POSTS, DEMO_USERS } from "@/lib/research/demo-catalog";
import { ADMIN_PROFILE_WRITE_SQL } from "@/lib/research/admin-write-sql";
import {
  DEMO_DISPLAY_NAMES_SQL,
  DEMO_SEED_WRITE_SQL,
} from "@/lib/research/demo-sql";
import { FORUM_WIPE_SQL } from "@/lib/research/forum-wipe-sql";
import { EXPAND_SUBTOPICS_SQL } from "@/lib/research/subtopics-sql";
import { VAULT_CATALOG, VAULT_THESES } from "@/lib/research/vault-catalog";
import {
  PASSIVE_DRAIN_HP,
  WEEKLY_CRON_LABEL,
} from "@/lib/research/economy";
import {
  COMMENTS_SQL_POLICIES,
  COMMENTS_SQL_TABLES,
} from "@/lib/research/comments-sql";
import { SETTLEMENT_APPLY_SQL } from "@/lib/research/settlement-apply-sql";
import { SETTLEMENT_SQL } from "@/lib/research/settlement-sql";
import { weeklyMaintenanceSql } from "@/lib/research/weekly-sql";
import { getLatestWeeklyRun } from "@/lib/research/weekly";
import { loadRevenueTotals } from "@/lib/research/invite";
import { TREASURY_PROFILE_ID } from "@/lib/research/referral";
import { requireAdmin } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/admin";
import { SUB_TOPICS, resolveTier, type Profile } from "@/types";
import { format, subDays } from "date-fns";

export const metadata: Metadata = {
  title: "Admin",
};

type SchemaStatus = {
  originalStake: boolean;
  settleApply: boolean;
  comments: boolean;
  moneyClosed: boolean;
  balanceFunctions: boolean;
  writesLocked: boolean;
  openNotes: boolean;
  textClosed: boolean;
};

const ROLLOUT: { key: keyof SchemaStatus; label: string; file: string }[] = [
  {
    key: "moneyClosed",
    label: "Money helpers closed to the apps",
    file: "20261012220000_close_money_functions.sql",
  },
  {
    key: "balanceFunctions",
    label: "Votes, stakes and cash-out run in SQL",
    file: "20261012221000_balance_functions.sql",
  },
  {
    key: "writesLocked",
    label: "Direct balance writes closed",
    file: "20261012223000_lock_direct_writes.sql",
  },
  {
    key: "openNotes",
    label: "Note reads go through the access view",
    file: "20261012224000_locked_note_reads.sql",
  },
  {
    key: "textClosed",
    label: "Locked-note text closed to direct reads",
    file: "20261012225000_close_locked_text.sql",
  },
];

async function loadSchemaStatus(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("laniakea_schema_status");
  return error || !data ? null : (data as SchemaStatus);
}

/** Used only while laniakea_schema_status is absent from the database. */
async function probeSchema(supabase: SupabaseClient) {
  const [stakeProbe, applyProbe, commentsProbe] = await Promise.all([
    supabase.from("research_posts").select("original_stake").limit(1),
    supabase.rpc("settle_hunted_post", {
      p_post_id: "00000000-0000-4000-8000-000000000000",
    }),
    supabase.from("research_comments").select("id").limit(1),
  ]);

  return {
    originalStake: !stakeProbe.error,
    settleApply:
      !applyProbe.error ||
      !(
        applyProbe.error.message.includes("42883") ||
        applyProbe.error.message.includes("does not exist") ||
        applyProbe.error.message.includes("schema cache")
      ),
    comments: !commentsProbe.error,
  };
}

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const now = new Date();
  const serverKeySet = createServiceClient() != null;
  const [{ data, error }, weekly, [revenue7d, revenue30d], status] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, role, tier, current_hp")
      .order("username", { ascending: true }),
    getLatestWeeklyRun(supabase),
    loadRevenueTotals(supabase, [subDays(now, 7), subDays(now, 30)]),
    loadSchemaStatus(supabase),
  ]);
  const schema = status ?? (await probeSchema(supabase));

  const profiles = (
    (data ?? []) as Pick<
      Profile,
      "id" | "username" | "display_name" | "role" | "tier" | "current_hp"
    >[]
  ).filter(
    (profile) =>
      profile.id !== TREASURY_PROFILE_ID &&
      profile.username !== "laniakea_treasury"
  );

  const demoUsernames = new Set(DEMO_USERS.map((user) => user.username));
  const demoProfiles = profiles.filter((profile) =>
    demoUsernames.has(profile.username)
  );
  const demoStillBronze =
    demoProfiles.length > 0 &&
    demoProfiles.every((profile) => resolveTier(profile.tier) === "Bronze");
  const catalogNameByUsername = new Map(
    DEMO_USERS.map((user) => [user.username, user.display_name])
  );
  const demoNamesStale = demoProfiles.some(
    (profile) =>
      catalogNameByUsername.get(profile.username) !== profile.display_name
  );

  const settlementReady = schema.originalStake;
  const applyReady = schema.settleApply;
  const commentsReady = schema.comments;

  const { data: demoPosts } = demoProfiles.length
    ? await supabase
        .from("research_posts")
        .select("id, title, author_id")
        .in(
          "author_id",
          demoProfiles.map((profile) => profile.id)
        )
    : { data: [] };
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const catalogByTitle = new Map(DEMO_POSTS.map((post) => [post.title, post]));
  const catalogPosts = (demoPosts ?? []).filter((post) =>
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
        title="Ops"
        description="Seed, wipe, schema, and weekly jobs. Metrics and content live on the other admin tabs."
      />
      <AdminNav current="/admin/ops" />

      <Panel>
        <PanelHeader label="Database" meta={status ? "live check" : "status SQL pending"} />
        {status ? (
          <div className="flex flex-col">
            {ROLLOUT.map((step) => (
              <div
                key={step.key}
                className="flex items-baseline justify-between gap-4 border-b border-border px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-foreground">{step.label}</p>
                  <p className="font-data text-[10px] text-muted-foreground">{step.file}</p>
                </div>
                <p
                  className={`shrink-0 font-data text-[11px] ${status[step.key] ? "text-gain" : "text-warning"}`}
                >
                  {status[step.key] ? "Live" : "Pending"}
                </p>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-[13px] text-foreground">Server key on this deployment</p>
                <p className="font-data text-[10px] text-muted-foreground">
                  SUPABASE_SERVICE_ROLE_KEY
                </p>
              </div>
              <p
                className={`shrink-0 font-data text-[11px] ${serverKeySet ? "text-gain" : "text-warning"}`}
              >
                {serverKeySet ? "Set" : "Missing"}
              </p>
            </div>
          </div>
        ) : (
          <p className="px-2.5 py-2 text-[12px] text-muted-foreground">
            Paste 20261012215000_ops_schema_status.sql once in the Supabase SQL editor to see
            which database changes are live.
          </p>
        )}
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-2.5 py-1.5">
          <div>
            <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Seed Demo Data
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Inserts {DEMO_USERS.length} demo users (4 per tier) and{" "}
              {DEMO_POSTS.length} hard-coded research notes across every
              sub-topic, plus matching HP ledger rows and sample votes. No
              manual posting and no external model calls. Re-running refreshes
              demo users and skips titles that already exist. Your admin role
              is left alone; this user votes on a subset so Wallet is not empty.
            </p>
            <p className="mt-1.5 font-data text-[10px] text-muted-foreground">
              Demo users {demoProfiles.length}/{DEMO_USERS.length}
              {" · "}
              catalog notes linked to the intended author {matchedPosts.length}/
              {DEMO_POSTS.length}
            </p>
            {demoStillBronze ? (
              <p className="mt-1.5 text-[12px] text-warning">
                Demo users are still Bronze. Signup created them with the
                default tier; RLS blocked the catalog write. Run the SQL below
                once, then click Seed Demo Data again.
              </p>
            ) : null}
            {demoNamesStale ? (
              <p className="mt-1.5 text-[12px] text-warning">
                Demo users still have the old human names. Paste the display
                name SQL once. It does not change HP or login usernames.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1">
            {demoNamesStale ? (
              <CopyInviteButton value={DEMO_DISPLAY_NAMES_SQL} label="Names SQL" />
            ) : null}
            <SeedDemoDataButton />
          </div>
        </div>
        {demoStillBronze ? (
          <pre className="max-h-48 overflow-auto border-t border-border bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
            {DEMO_SEED_WRITE_SQL}
          </pre>
        ) : null}
        {demoNamesStale ? (
          <pre className="max-h-40 overflow-auto border-t border-border bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
            {DEMO_DISPLAY_NAMES_SQL}
          </pre>
        ) : null}
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-2.5 py-1.5">
          <div>
            <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Wipe tape
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Deletes every note, comment, vote, reaction, draft, save, unlock,
              and topic book. Desks, overall HP, UTL, and invites stay. Do not
              click Seed Demo Data afterwards if you want the floor empty.
              Paste the SQL once so the wipe function exists, then type WIPE.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <CopyInviteButton value={FORUM_WIPE_SQL} label="SQL" />
            <WipeForumButton />
          </div>
        </div>
        <pre className="max-h-40 overflow-auto bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
          {FORUM_WIPE_SQL}
        </pre>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-2.5 py-1.5">
          <div>
            <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Sub-topics
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              One book list for publish, feed, and ranking.{" "}
              {VAULT_THESES.length} theses, {VAULT_CATALOG.length} vault files
              mapped. Paste the topic SQL once so publish does not bounce.
            </p>
          </div>
          <CopyInviteButton value={EXPAND_SUBTOPICS_SQL} label="SQL" />
        </div>
        <div className="flex flex-col">
          {SUB_TOPICS.map((topic) => (
            <div
              key={topic}
              className="flex items-baseline justify-between gap-4 border-b border-border px-2.5 py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[13px] text-foreground">{topic}</p>
              </div>
              <p className="shrink-0 font-data text-[11px] text-muted-foreground tabular-nums">
                {VAULT_CATALOG.filter((entry) => entry.topic === topic).length}
              </p>
            </div>
          ))}
        </div>
        <pre className="max-h-32 overflow-auto border-t border-border bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
          {EXPAND_SUBTOPICS_SQL}
        </pre>
      </Panel>

      <Panel>
        <PanelHeader label="UTL residual" meta="7d / 30d" />
        {revenue7d.error ? (
          <p className="px-2.5 py-2 font-data text-[12px] text-muted-foreground">
            {revenue7d.error}
          </p>
        ) : (
          <dl className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
            <div className="px-2.5 py-2.5">
              <dt className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Creator share
              </dt>
              <dd className="mt-1 font-data text-[13px] text-foreground">
                {revenue7d.creatorShare} / {revenue30d.creatorShare}
              </dd>
            </div>
            <div className="px-2.5 py-2.5">
              <dt className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Referral pool
              </dt>
              <dd className="mt-1 font-data text-[13px] text-foreground">
                {revenue7d.referralPool} / {revenue30d.referralPool}
              </dd>
            </div>
            <div className="px-2.5 py-2.5">
              <dt className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Platform burn
              </dt>
              <dd className="mt-1 font-data text-[13px] text-foreground">
                {revenue7d.platformBurn + revenue7d.dust} /{" "}
                {revenue30d.platformBurn + revenue30d.dust}
              </dd>
            </div>
            <div className="px-2.5 py-2.5">
              <dt className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Events
              </dt>
              <dd className="mt-1 font-data text-[13px] text-foreground">
                {revenue7d.events} / {revenue30d.events}
              </dd>
            </div>
          </dl>
        )}
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-2.5 py-1.5">
          <div>
            <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Profiles
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Edit role, tier, and HP on any user. If Save does nothing, paste
              the Admin write SQL once — it does not reset demo catalog HP.
            </p>
          </div>
          <CopyInviteButton value={ADMIN_PROFILE_WRITE_SQL} label="SQL" />
        </div>
        <pre className="max-h-32 overflow-auto border-b border-border bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
          {ADMIN_PROFILE_WRITE_SQL}
        </pre>
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
              non-admin users, then promote / demote the top and bottom
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

      {applyReady ? null : (
        <Panel>
          <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-2.5 py-1.5">
            <div>
              <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                Settlement apply
              </p>
              <p className="mt-1 text-[12px] text-warning">
                Hunt archived the note, then bounty could not credit users.
                Paste this once, then open the hunted note again.
              </p>
            </div>
            <CopyInviteButton value={SETTLEMENT_APPLY_SQL} label="SQL" />
          </div>
          <pre className="max-h-48 overflow-auto bg-panel-elevated p-2.5 font-data text-[10px] leading-relaxed text-foreground">
            {SETTLEMENT_APPLY_SQL}
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
