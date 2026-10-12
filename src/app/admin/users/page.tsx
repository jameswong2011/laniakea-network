import type { Metadata } from "next";
import { format } from "date-fns";
import { AdminNav } from "@/components/laniakea/AdminNav";
import { PageFrame, PageHeading, Panel, PanelHeader } from "@/components/layout/PageFrame";
import { loadAdminMetrics } from "@/lib/admin/metrics";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin users" };

export default async function AdminUsersPage() {
  const { supabase } = await requireAdmin();
  const metrics = await loadAdminMetrics(supabase);

  return (
    <PageFrame width="wide">
      <PageHeading
        kicker="Superuser"
        title="Users"
        description="Each row is one user. Activity is posts, comments, and votes. Model use is recorded after the usage table exists."
      />
      <AdminNav current="/admin/users" />
      {metrics.usageMissing ? (
        <p className="text-[13px] text-warning">
          Model columns stay at zero until supabase/migrations/20261012190000_ai_usage.sql is applied.
        </p>
      ) : null}
      <Panel>
        <PanelHeader label="Activity" meta={metrics.people.length} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-left text-[12px]">
            <thead className="font-data text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              <tr className="border-b border-border">
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Last active</th>
                <th className="px-2 py-2">Posts 24h</th>
                <th className="px-2 py-2">Comments 24h</th>
                <th className="px-2 py-2">Posts 7d</th>
                <th className="px-2 py-2">Comments 7d</th>
                <th className="px-2 py-2">LLM calls</th>
                <th className="px-2 py-2">Tokens</th>
                <th className="px-2 py-2">USD</th>
                <th className="px-2 py-2">HP</th>
                <th className="px-2 py-2">UTL</th>
              </tr>
            </thead>
            <tbody>
              {metrics.people.map((person) => (
                <tr key={person.id} className="border-b border-border last:border-b-0">
                  <td className="px-2 py-2">
                    <p>{person.displayName}</p>
                    <p className="text-muted-foreground">
                      @{person.username} · {person.tier}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {person.lastActive ? format(new Date(person.lastActive), "d MMM HH:mm") : "—"}
                  </td>
                  <td className="px-2 py-2">{person.posts24}</td>
                  <td className="px-2 py-2">{person.comments24}</td>
                  <td className="px-2 py-2">{person.posts7}</td>
                  <td className="px-2 py-2">{person.comments7}</td>
                  <td className="px-2 py-2">{person.llmCalls}</td>
                  <td className="px-2 py-2">{person.llmTokens}</td>
                  <td className="px-2 py-2">{person.llmCost.toFixed(4)}</td>
                  <td className="px-2 py-2">{person.hp}</td>
                  <td className="px-2 py-2">{person.utl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageFrame>
  );
}
