import type { Metadata } from "next";
import Link from "next/link";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { HpReadout } from "@/components/laniakea/HpReadout";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { TokenReadout } from "@/components/laniakea/TokenReadout";
import { requireUser } from "@/lib/auth/session";
import { format } from "date-fns";
import { formatHp } from "@/lib/format";
import { HealthMeter } from "@/components/laniakea/HealthMeter";
import {
  getSubtopicRanks,
  topicStandingsForUser,
} from "@/lib/research/subtopic-ranks";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { userId, profile, supabase } = await requireUser();
  const { ranks } = await getSubtopicRanks(supabase);
  const standings = topicStandingsForUser(ranks, userId);
  const authoredWithStake = await supabase
    .from("research_posts")
    .select(
      "id, title, status, current_health, original_stake, sub_topic, created_at"
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  const authored =
    authoredWithStake.error &&
    authoredWithStake.error.message.includes("original_stake")
      ? await supabase
          .from("research_posts")
          .select("id, title, status, current_health, sub_topic, created_at")
          .eq("author_id", userId)
          .order("created_at", { ascending: false })
      : authoredWithStake;

  const deskPosts = authored.data ?? [];

  return (
    <PageFrame width="narrow">
      <PageHeading
        kicker="Session"
        title="Account"
        description="Identity, overall tier, and sub-topic books."
        meta={
          <Link
            href="/wallet"
            className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground"
          >
            Open wallet
          </Link>
        }
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

          <dl className="grid grid-cols-4 divide-x divide-border">
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
                Overall tier
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
                <Link href="/wallet">
                  <HpReadout value={profile.current_hp} size="md" />
                </Link>
              </dd>
            </div>
            <div className="px-2.5 py-2.5">
              <dt className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                UTL
              </dt>
              <dd className="mt-1.5">
                <Link href="/wallet">
                  <TokenReadout value={profile.utility_tokens} size="md" />
                </Link>
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

      <Panel>
        <PanelHeader label="Your notes" meta={deskPosts.length} />
        {deskPosts.length === 0 ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-muted-foreground">
            Published notes stay here after they are hunted off the feed.
          </p>
        ) : (
          <div className="flex flex-col">
            {deskPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between gap-3 border-b border-border px-2.5 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-foreground">
                    {post.title}
                  </p>
                  <p className="mt-0.5 font-data text-[10px] text-muted-foreground uppercase">
                    {post.status}
                    {post.sub_topic ? ` · ${post.sub_topic}` : ""}
                    {" · "}
                    {format(new Date(post.created_at), "dd MMM yyyy")}
                  </p>
                </div>
                <HealthMeter
                  currentHealth={post.current_health}
                  originalStake={
                    "original_stake" in post &&
                    typeof post.original_stake === "number"
                      ? post.original_stake
                      : undefined
                  }
                  status={post.status}
                />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader label="Sub-topic ranks" meta={standings.length} />
        {standings.length === 0 ? (
          <p className="px-2.5 py-3 font-data text-[12px] text-muted-foreground">
            Publish or vote in a sub-topic to open a topic book.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Topic
                </th>
                <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Rank
                </th>
                <th className="px-2.5 py-1.5 font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Tier
                </th>
                <th className="px-2.5 py-1.5 text-right font-data text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Topic HP
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr
                  key={row.subTopic}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-2.5 py-1.5">
                    <SubTopicBadge topic={row.subTopic} />
                  </td>
                  <td className="px-2.5 py-1.5 font-data text-[12px] text-muted-foreground">
                    {String(row.rank).padStart(2, "0")}
                    <span className="text-[10px]">
                      /{String(row.participants).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5">
                    <TierBadge tier={row.tier} />
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-data text-[12px] text-gain">
                    {formatHp(row.currentHp)}
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
