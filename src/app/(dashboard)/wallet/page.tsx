import type { Metadata } from "next";
import { format } from "date-fns";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { HpReadout } from "@/components/laniakea/HpReadout";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { requireUser } from "@/lib/auth/session";
import { formatSignedHp } from "@/lib/format";
import { getWalletLedger } from "@/lib/research/wallet";

export const metadata: Metadata = {
  title: "Wallet",
};

export default async function WalletPage() {
  const { userId, profile, supabase } = await requireUser();
  const { entries, error } = await getWalletLedger(supabase, userId);

  return (
    <PageFrame>
      <PageHeading
        kicker="Ledger"
        title="Wallet"
        description="Full HP transaction history for this account."
        meta={<HpReadout value={profile?.current_hp ?? null} size="md" />}
      />

      <Panel>
        <PanelHeader label="HP transactions" meta={entries.length} />

        {error ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-loss">
            {error}
          </p>
        ) : entries.length === 0 ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-muted-foreground">
            No HP transactions yet.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Time
                </th>
                <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Type
                </th>
                <th className="px-2.5 py-1.5 text-right font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Amount
                </th>
                <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Description
                </th>
                <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Related post
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-b-0">
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-data text-[11px] text-muted-foreground">
                    {format(new Date(entry.created_at), "dd MMM yyyy HH:mm")}
                  </td>
                  <td className="px-2.5 py-1.5 font-data text-[10px] tracking-[0.12em] text-foreground uppercase">
                    {entry.type}
                  </td>
                  <td
                    className={`px-2.5 py-1.5 text-right font-data text-[12px] ${
                      entry.signedAmount < 0
                        ? "text-loss"
                        : entry.signedAmount > 0
                          ? "text-gain"
                          : "text-muted-foreground"
                    }`}
                  >
                    {formatSignedHp(entry.signedAmount)}
                  </td>
                  <td className="px-2.5 py-1.5 text-[12px] text-muted-foreground">
                    {entry.description ?? "—"}
                  </td>
                  <td className="px-2.5 py-1.5">
                    {entry.relatedPost ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <SubTopicBadge topic={entry.relatedPost.sub_topic} />
                        <span className="truncate font-data text-[12px] text-foreground">
                          {entry.relatedPost.title}
                        </span>
                      </div>
                    ) : (
                      <span className="font-data text-[11px] text-muted-foreground">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </PageFrame>
  );
}
