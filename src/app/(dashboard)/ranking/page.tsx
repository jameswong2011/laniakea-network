import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { CalibrationButton } from "@/components/laniakea/CalibrationButton";
import { DeskAvatar } from "@/components/laniakea/DeskAvatar";
import { RankingTierNav } from "@/components/laniakea/RankingTierNav";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { profilePath } from "@/lib/research/forum";
import { requireUser } from "@/lib/auth/session";
import { formatHp } from "@/lib/format";
import { CALIBRATION_QUARTILE } from "@/lib/research/calibration";
import { WEEKLY_CRON_LABEL } from "@/lib/research/economy";
import {
  HP_TRANSACTION_CALIBRATION,
  compareTierThenHp,
  resolveTier,
  type HpTransaction,
  type Profile,
} from "@/types";

export const metadata: Metadata = {
  title: "Ranking",
};

const RANKING_LIMIT = 1000;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RankingPage({
  searchParams,
}: PageProps<"/ranking">) {
  const { tier: tierParam } = await searchParams;
  const selectedTier = resolveTier(firstSearchParam(tierParam));
  const { supabase, userId, profile } = await requireUser();

  function tierScoped<Q extends { ilike: (column: string, pattern: string) => Q }>(query: Q) {
    return selectedTier ? query.ilike("tier", selectedTier) : query;
  }

  const [withAvatar, { data: logRows }] = await Promise.all([
    tierScoped(
      supabase
        .from("profiles")
        .select("id, username, display_name, role, tier, current_hp, avatar_url")
    )
      .order("current_hp", { ascending: false })
      .limit(RANKING_LIMIT),
    supabase
      .from("hp_transactions")
      .select("id, user_id, description, created_at, type")
      .eq("type", HP_TRANSACTION_CALIBRATION)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const listed =
    withAvatar.error && withAvatar.error.message.includes("avatar_url")
      ? await tierScoped(
          supabase
            .from("profiles")
            .select("id, username, display_name, role, tier, current_hp")
        )
          .order("current_hp", { ascending: false })
          .limit(RANKING_LIMIT)
      : withAvatar;
  const { data, error } = listed;

  const profiles = (
    (data ?? []) as Array<
      Pick<
        Profile,
        "id" | "username" | "display_name" | "role" | "tier" | "current_hp"
      > & { avatar_url?: string | null }
    >
  ).filter((row) => row.username !== "laniakea_treasury");
  const profilesById = new Map(profiles.map((row) => [row.id, row]));
  const isAdmin = profile?.role === "admin";
  const ranked = [...profiles].sort(compareTierThenHp);
  const rows = selectedTier
    ? ranked.filter((row) => resolveTier(row.tier) === selectedTier)
    : ranked;
  const listError = error?.message ?? null;
  const quartilePct = Math.round(CALIBRATION_QUARTILE * 100);

  const calibrationLogs = (logRows ?? []) as Pick<
    HpTransaction,
    "id" | "user_id" | "description" | "created_at" | "type"
  >[];

  return (
    <PageFrame>
      <PageHeading
        kicker="Standings"
        title="Ranking"
        description={
          selectedTier
            ? `${selectedTier} users, ordered by HP.`
            : `Overall book by research tier, then HP among those users. Weekly calibration (${WEEKLY_CRON_LABEL}) promotes the top ${quartilePct}% and demotes the bottom ${quartilePct}%, one tier at a time, and resets swept users to 1000 HP.`
        }
        meta={isAdmin ? <CalibrationButton /> : null}
      />

      <RankingTierNav selected={selectedTier} />

      <Panel>
        <PanelHeader label="Leaderboard" meta={rows.length} />

        {listError ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-loss">
            {listError}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-muted-foreground">
            {selectedTier ? `No users in ${selectedTier}.` : "No profiles found."}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="w-12 px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Rank
                </th>
                <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Identity
                </th>
                <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Tier
                </th>
                <th className="px-2.5 py-1.5 text-right font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  HP
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isViewer = row.id === userId;

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-b-0 ${
                      isViewer ? "bg-panel-elevated" : ""
                    }`}
                  >
                    <td className="px-2.5 py-1.5 font-data text-[12px] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <Link
                        href={profilePath(row.username)}
                        className="flex items-center gap-2 hover:opacity-90"
                      >
                        <DeskAvatar
                          url={"avatar_url" in row ? row.avatar_url : null}
                          name={row.display_name}
                        />
                        <span className="min-w-0">
                          <span className="block font-data text-[12px] text-foreground hover:underline">
                            {row.display_name}
                            {isViewer ? (
                              <span className="ml-2 text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                                You
                              </span>
                            ) : null}
                          </span>
                          <span className="block font-data text-[10px] text-muted-foreground">
                            @{row.username}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <TierBadge tier={row.tier} size="md" />
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-data text-[12px] text-gain">
                      {formatHp(row.current_hp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {calibrationLogs.length > 0 ? (
        <Panel>
          <PanelHeader label="Recent calibration" meta={calibrationLogs.length} />
          <ul className="divide-y divide-border">
            {calibrationLogs.map((entry) => {
              const identity = profilesById.get(entry.user_id);

              return (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="font-data text-[12px] text-foreground">
                      {identity?.display_name ?? "Unknown"}
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        @{identity?.username ?? entry.user_id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {entry.description ?? "Tier change"}
                    </p>
                  </div>
                  <span className="shrink-0 font-data text-[10px] text-muted-foreground">
                    {format(new Date(entry.created_at), "dd MMM HH:mm")}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}
    </PageFrame>
  );
}
