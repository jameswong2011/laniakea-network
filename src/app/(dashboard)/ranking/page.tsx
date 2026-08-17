import type { Metadata } from "next";
import { format } from "date-fns";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { CalibrationButton } from "@/components/laniakea/CalibrationButton";
import { RankingBooks } from "@/components/laniakea/RankingBooks";
import { RankingTopicNav } from "@/components/laniakea/RankingTopicNav";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { formatHp } from "@/lib/format";
import { CALIBRATION_QUARTILE } from "@/lib/research/calibration";
import { WEEKLY_CRON_LABEL } from "@/lib/research/economy";
import {
  getSubtopicRanks,
  topicBooksByUser,
} from "@/lib/research/subtopic-ranks";
import {
  HP_TRANSACTION_CALIBRATION,
  resolveSubTopic,
  type HpTransaction,
  type Profile,
} from "@/types";

export const metadata: Metadata = {
  title: "Ranking",
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RankingPage({
  searchParams,
}: PageProps<"/ranking">) {
  const { topic: topicParam } = await searchParams;
  const selectedTopic = resolveSubTopic(firstSearchParam(topicParam));
  const { supabase, userId, profile } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, role, tier, current_hp")
    .order("current_hp", { ascending: false })
    .order("username", { ascending: true });

  const profiles = (data ?? []) as Pick<
    Profile,
    "id" | "username" | "display_name" | "role" | "tier" | "current_hp"
  >[];
  const profilesById = new Map(profiles.map((row) => [row.id, row]));
  const isAdmin = profile?.role === "admin";
  const { ranks: allTopicRanks } = await getSubtopicRanks(supabase);
  const booksByUser = topicBooksByUser(allTopicRanks, 2);

  const topicRanks = selectedTopic
    ? {
        ranks: allTopicRanks.filter(
          (rank) => resolveSubTopic(rank.sub_topic) === selectedTopic
        ),
        error: null,
      }
    : { ranks: [], error: null };

  const topicRows = topicRanks.ranks
    .map((rank) => {
      const identity = profilesById.get(rank.user_id);

      return {
        id: rank.user_id,
        username: identity?.username ?? rank.user_id.slice(0, 8),
        display_name: identity?.display_name ?? "Unknown",
        role: identity?.role ?? "member",
        tier: rank.tier,
        current_hp: rank.current_hp,
        overallTier: identity?.tier ?? "Bronze",
        overallHp: identity?.current_hp ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.current_hp !== a.current_hp) {
        return b.current_hp - a.current_hp;
      }

      return a.username.localeCompare(b.username);
    });

  const rows = selectedTopic ? topicRows : profiles;
  const listError = selectedTopic ? topicRanks.error : error?.message ?? null;
  const quartilePct = Math.round(CALIBRATION_QUARTILE * 100);

  const { data: logRows } = await supabase
    .from("hp_transactions")
    .select("id, user_id, description, created_at, type")
    .eq("type", HP_TRANSACTION_CALIBRATION)
    .order("created_at", { ascending: false })
    .limit(8);

  const calibrationLogs = (logRows ?? []) as Pick<
    HpTransaction,
    "id" | "user_id" | "description" | "created_at" | "type"
  >[];

  return (
    <PageFrame>
      <PageHeading
        kicker="Standings"
        title={selectedTopic ? `${selectedTopic} Ranking` : "Ranking"}
        description={
          selectedTopic
            ? `Topic book by ${selectedTopic} HP. Overall desk is shown for context. Calibration moves the top and bottom ${quartilePct}% each week (${WEEKLY_CRON_LABEL}).`
            : `Overall book by current HP. Weekly calibration (${WEEKLY_CRON_LABEL}) promotes the top ${quartilePct}% and demotes the bottom ${quartilePct}%, one tier at a time.`
        }
        meta={
          <>
            {selectedTopic ? <SubTopicBadge topic={selectedTopic} size="md" /> : null}
            {isAdmin ? <CalibrationButton /> : null}
          </>
        }
      />

      <RankingTopicNav selected={selectedTopic} />

      <Panel>
        <PanelHeader
          label={selectedTopic ? `${selectedTopic} book` : "Leaderboard"}
          meta={rows.length}
        />

        {listError ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-loss">
            {listError}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-muted-foreground">
            {selectedTopic
              ? "No participants in this sub-topic yet."
              : "No profiles found."}
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
                {selectedTopic ? (
                  <>
                    <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                      Topic tier
                    </th>
                    <th className="px-2.5 py-1.5 text-right font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                      Topic HP
                    </th>
                    <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                      Overall
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                      Tier
                    </th>
                    <th className="px-2.5 py-1.5 text-right font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                      HP
                    </th>
                    <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                      Books
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isViewer = row.id === userId;
                const topicRow = "overallTier" in row ? row : null;

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
                      <p className="font-data text-[12px] text-foreground">
                        {row.display_name}
                        {isViewer ? (
                          <span className="ml-2 text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className="font-data text-[10px] text-muted-foreground">
                        @{row.username}
                      </p>
                    </td>
                    {topicRow ? (
                      <>
                        <td className="px-2.5 py-1.5">
                          <TierBadge tier={topicRow.tier} size="md" />
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-data text-[12px] text-gain">
                          {formatHp(topicRow.current_hp)}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <TierBadge tier={topicRow.overallTier} />
                            <span className="font-data text-[11px] text-gain">
                              {formatHp(topicRow.overallHp)}
                            </span>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2.5 py-1.5">
                          <TierBadge tier={row.tier} size="md" />
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-data text-[12px] text-gain">
                          {formatHp(row.current_hp)}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <RankingBooks books={booksByUser.get(row.id) ?? []} />
                        </td>
                      </>
                    )}
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
