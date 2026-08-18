import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { BuyInviteButton } from "@/components/laniakea/BuyInviteButton";
import { CopyInviteButton } from "@/components/laniakea/CopyInviteButton";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { TokenReadout } from "@/components/laniakea/TokenReadout";
import { requireUser } from "@/lib/auth/session";
import { loadInviteDesk } from "@/lib/research/invite";
import {
  INVITE_PURCHASE_UTL,
  inviteSharePath,
} from "@/lib/research/referral";
import { resolveTier } from "@/types";

export const metadata: Metadata = {
  title: "Invites",
};

export default async function InvitesPage() {
  const { supabase, userId, profile } = await requireUser();
  const desk = await loadInviteDesk(supabase, userId);
  const available = desk.codes.filter((code) => code.status === "available");
  const redeemed = desk.codes.filter((code) => code.status === "redeemed");
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <PageFrame>
      <PageHeading
        kicker="Desk"
        title="Invites"
        description="Five grant codes at signup. Extra codes cost 100 UTL. Invitees start on your current desk. You earn half of each residual hop from their UTL spend."
        meta={
          <>
            <TokenReadout value={profile?.utility_tokens ?? 0} size="md" />
            <span className="font-data text-[11px] text-muted-foreground">
              {available.length} open · {redeemed.length} used
            </span>
          </>
        }
      />

      {desk.error ? (
        <p className="border border-border bg-panel px-2.5 py-3 font-data text-[12px] text-loss">
          {desk.error}
        </p>
      ) : null}

      <Panel>
        <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-2.5 py-1.5">
          <div>
            <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Your codes
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Share a link or the code. One redemption each. Buy another for{" "}
              {INVITE_PURCHASE_UTL} UTL.
            </p>
          </div>
          <BuyInviteButton availableTokens={profile?.utility_tokens ?? 0} />
        </div>
        {desk.codes.length === 0 && !desk.error ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-muted-foreground">
            No codes yet. Refresh after the invite SQL has been run.
          </p>
        ) : (
          <div className="flex flex-col">
            {desk.codes.map((row) => {
              const path = inviteSharePath(row.code);
              const share = origin ? `${origin}${path}` : path;

              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2.5 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="font-data text-[13px] text-foreground">
                      {row.code}
                    </p>
                    <p className="mt-0.5 font-data text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                      {row.status}
                      {" · "}
                      {row.minted_how === "token_purchase" ? "bought" : "grant"}
                    </p>
                  </div>
                  {row.status === "available" ? (
                    <div className="flex items-center gap-1.5">
                      <CopyInviteButton value={row.code} label="Code" />
                      <CopyInviteButton value={share} label="Link" />
                    </div>
                  ) : (
                    <span className="font-data text-[10px] text-muted-foreground uppercase">
                      Redeemed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader label="Direct invitees" meta={desk.invitees.length} />
        {desk.invitees.length === 0 ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-muted-foreground">
            Nobody has redeemed your codes yet.
          </p>
        ) : (
          <div className="flex flex-col">
            {desk.invitees.map((invitee) => (
              <div
                key={invitee.id}
                className="flex items-center justify-between gap-3 border-b border-border px-2.5 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-foreground">
                    {invitee.display_name}
                  </p>
                  <p className="font-data text-[11px] text-muted-foreground">
                    @{invitee.username}
                    {" · "}
                    {format(new Date(invitee.created_at), "dd MMM yyyy")}
                  </p>
                </div>
                <TierBadge tier={resolveTier(invitee.tier) ?? "Bronze"} />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          label="Referral earnings"
          meta={`${desk.referralTotal} UTL`}
        />
        {desk.earnings.length === 0 ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-muted-foreground">
            Residual UTL from invitees and their downline will land here.
          </p>
        ) : (
          <div className="flex flex-col">
            {desk.earnings.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between gap-3 border-b border-border px-2.5 py-2 last:border-b-0"
              >
                <p className="font-data text-[11px] text-muted-foreground">
                  Depth {line.depth}
                  {line.action ? ` · ${line.action}` : ""}
                  {" · "}
                  {format(new Date(line.created_at), "dd MMM yyyy HH:mm")}
                </p>
                <p className="font-data text-[13px] text-gain">+{line.amount} UTL</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="font-data text-[11px] text-muted-foreground">
        <Link href="/wallet" className="hover:text-foreground">
          Wallet
        </Link>
        {" · "}
        Account code {profile?.account_code ?? "—"}
        {profile?.registration_path === "invite" ? " · joined by invite" : " · public desk"}
      </p>
    </PageFrame>
  );
}
