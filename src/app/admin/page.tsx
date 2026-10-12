import type { Metadata } from "next";
import { AdminNav } from "@/components/laniakea/AdminNav";
import { PageFrame, PageHeading, Panel, PanelHeader } from "@/components/layout/PageFrame";
import { loadAdminMetrics, type Pnl } from "@/lib/admin/metrics";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin" };

function money(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function rate(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function PnlRow({ label, row }: { label: string; row: Pnl }) {
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-border px-3 py-2 text-[13px] last:border-b-0 md:grid-cols-6">
      <p className="text-muted-foreground">{label}</p>
      <p>Gross {row.gross}</p>
      <p>Creators {row.creator}</p>
      <p>Invites {row.referral}</p>
      <p>Burn {row.burn + row.dust}</p>
      <p>{row.events} events</p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();
  const metrics = await loadAdminMetrics(supabase);

  return (
    <PageFrame width="wide">
      <PageHeading
        kicker="Superuser"
        title="Admin"
        description="Activity, project P&L, and model use. Content edits, user rows, and the invite tree are on the other tabs."
      />
      <AdminNav current="/admin" />
      {metrics.error ? <p className="text-[13px] text-loss">{metrics.error}</p> : null}

      <Panel>
        <PanelHeader label="Activity" meta="posts, comments, votes" />
        <dl className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4">
          <Stat label="DAU" value={String(metrics.dau)} />
          <Stat label="WAU" value={String(metrics.wau)} />
          <Stat label="MAU" value={String(metrics.mau)} />
          <Stat label="Users" value={String(metrics.users)} />
          <Stat label="Signups 7d" value={String(metrics.signups7)} />
          <Stat label="Signups 30d" value={String(metrics.signups30)} />
          <Stat label="Posts / user / hr" value={rate(metrics.postsPerUserHour)} />
          <Stat label="Comments / user / hr" value={rate(metrics.commentsPerUserHour)} />
        </dl>
        <p className="border-t border-border px-3 py-2 text-[12px] text-muted-foreground">
          Last 24 hours: {metrics.posts24} posts, {metrics.comments24} comments. Rates divide those counts by the people who posted or commented, then by 24 hours.
        </p>
      </Panel>

      <Panel>
        <PanelHeader label="Project P&L" meta="UTL" />
        <PnlRow label="7 days" row={metrics.pnl7} />
        <PnlRow label="30 days" row={metrics.pnl30} />
        <PnlRow label="All time" row={metrics.pnlAll} />
        <p className="border-t border-border px-3 py-2 text-[12px] text-muted-foreground">
          Gross is UTL spent. Creators and invites are paid out. Burn plus dust is what the project removes. Outstanding stock: {metrics.hpOutstanding} HP, {metrics.utlOutstanding} UTL. Live notes {metrics.liveNotes}. Comments loaded {metrics.comments}.
        </p>
      </Panel>

      <Panel>
        <PanelHeader label="Model use" meta={metrics.usageMissing ? "SQL missing" : "all calls"} />
        {metrics.usageMissing ? (
          <p className="px-3 py-3 text-[13px] text-warning">
            Run supabase/migrations/20261012190000_ai_usage.sql, and keep the service role key on the server. Calls made before that are not in this table.
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-2 divide-x divide-border md:grid-cols-3">
              <Stat label="Calls" value={String(metrics.llm.calls)} />
              <Stat label="Tokens" value={String(metrics.llm.tokens)} />
              <Stat label="Cost USD" value={money(metrics.llm.cost)} />
              <Stat label="Calls 24h" value={String(metrics.llm.calls24)} />
              <Stat label="Tokens 24h" value={String(metrics.llm.tokens24)} />
              <Stat label="Cost 24h" value={money(metrics.llm.cost24)} />
            </dl>
            <div className="border-t border-border">
              {metrics.llmByFeature.length === 0 ? (
                <p className="px-3 py-3 text-[13px] text-muted-foreground">No model calls recorded yet.</p>
              ) : (
                metrics.llmByFeature.map((row) => (
                  <p key={row.feature} className="border-b border-border px-3 py-2 text-[13px] last:border-b-0">
                    {row.feature} · {row.calls} calls · {row.tokens} tokens · ${money(row.cost)}
                    {row.calls > 0 ? ` · $${money(row.cost / row.calls)} each` : ""}
                  </p>
                ))
              )}
            </div>
          </>
        )}
      </Panel>

      <Panel>
        <PanelHeader label="Cohort retention" meta="still active after joining" />
        <dl className="grid grid-cols-2 divide-x divide-border">
          <Stat
            label="Day 7"
            value={percent(metrics.retention7.share)}
            hint={`${metrics.retention7.retained} of ${metrics.retention7.eligible} old enough`}
          />
          <Stat
            label="Day 30"
            value={percent(metrics.retention30.share)}
            hint={`${metrics.retention30.retained} of ${metrics.retention30.eligible} old enough`}
          />
        </dl>
        <p className="border-t border-border px-3 py-2 text-[12px] text-muted-foreground">
          A user counts only after they have been here long enough. They are retained when their latest post, comment, or vote is on or after that day.
        </p>
      </Panel>

      <Panel>
        <PanelHeader label="Invite funnel" />
        {metrics.funnel.missing ? (
          <p className="px-3 py-3 text-[13px] text-warning">Invite codes are not in this database yet.</p>
        ) : (
          <dl className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
            <Stat label="Codes minted" value={String(metrics.funnel.minted)} />
            <Stat label="Redeemed" value={String(metrics.funnel.redeemed)} />
            <Stat label="Published a note" value={String(metrics.funnel.published)} />
            <Stat label="Redeemed who publish" value={percent(metrics.funnel.publishShare)} />
          </dl>
        )}
      </Panel>

      <Panel>
        <PanelHeader label="Cost per call" meta="USD" />
        <dl className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          <Stat label="Ask" value={money(metrics.unitCost.ask.each)} hint={`${metrics.unitCost.ask.calls} calls`} />
          <Stat label="Summary" value={money(metrics.unitCost.summary.each)} hint={`${metrics.unitCost.summary.calls} calls`} />
          <Stat label="Meaning search" value={money(metrics.unitCost.search.each)} hint={`${metrics.unitCost.search.calls} calls`} />
        </dl>
      </Panel>

      <Panel>
        <PanelHeader label="HP concentration" />
        <dl className="grid grid-cols-2 divide-x divide-border">
          <Stat label="Top 10 share" value={percent(metrics.hpTopTenShare)} />
          <Stat label="Top 10 HP" value={String(metrics.hpTopTen)} hint={`of ${metrics.hpOutstanding}`} />
        </dl>
      </Panel>

      <Panel>
        <PanelHeader label="Export" />
        <div className="flex flex-wrap gap-3 px-3 py-3 text-[14px]">
          <a href="/admin/export?kind=users" className="underline">
            User table CSV
          </a>
          <a href="/admin/export?kind=invites" className="underline">
            Invite tree CSV
          </a>
        </div>
      </Panel>
    </PageFrame>
  );
}

function percent(share: number) {
  return `${(share * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-3 py-3">
      <dt className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 font-data text-[16px] text-foreground">{value}</dd>
      {hint ? <dd className="mt-1 text-[12px] text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}
