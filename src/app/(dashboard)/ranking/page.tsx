import type { Metadata } from "next";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { CalibrationButton } from "@/components/laniakea/CalibrationButton";
import { RankingTopicNav } from "@/components/laniakea/RankingTopicNav";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { formatHp } from "@/lib/format";
import { CALIBRATION_BAND } from "@/lib/research/calibration";
import { getSubtopicRanks } from "@/lib/research/subtopic-ranks";
import { resolveSubTopic, type Profile } from "@/types";

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

  const topicRanks = selectedTopic
    ? await getSubtopicRanks(supabase, selectedTopic)
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

  return (
    <PageFrame>
      <PageHeading
        kicker="Standings"
        title={selectedTopic ? `${selectedTopic} Ranking` : "Ranking"}
        description={
          selectedTopic
            ? `Topic book ordered by ${selectedTopic} HP. Overall tier stays on Account.`
            : `Ordered by current HP. Calibration moves the top and bottom ${Math.round(CALIBRATION_BAND * 100)}% one tier, including each sub-topic book.`
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
                {selectedTopic ? null : (
                  <th className="w-20 px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Role
                  </th>
                )}
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
                    {selectedTopic ? null : (
                      <td className="px-2.5 py-1.5 font-data text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                        {row.role}
                      </td>
                    )}
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
    </PageFrame>
  );
}
