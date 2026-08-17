import type { Metadata } from "next";
import { PageFrame, PageHeading } from "@/components/layout/PageFrame";
import { NewResearchForm } from "@/components/laniakea/NewResearchForm";
import { ResearchFeed } from "@/components/laniakea/ResearchFeed";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { VOTE_COST_HP } from "@/lib/research/economy";
import { getLiveResearchFeed, getViewerVotes } from "@/lib/research/feed";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage() {
  const { supabase, userId, profile } = await requireUser();
  const { items, error } = await getLiveResearchFeed(supabase);
  const viewerVotes = await getViewerVotes(
    supabase,
    userId,
    items.map((item) => item.id)
  );
  const availableHp = profile?.current_hp ?? 0;

  return (
    <PageFrame>
      <PageHeading
        kicker="Market"
        title="Research Feed"
        description={`Stake HP to publish. Votes cost ${VOTE_COST_HP} HP and move post health.`}
        meta={
          <>
            {profile ? <TierBadge tier={profile.tier} size="md" /> : null}
            <span className="font-data text-[11px] text-muted-foreground">
              {items.length} live
            </span>
          </>
        }
      />

      <NewResearchForm availableHp={availableHp} />

      {error ? (
        <p className="border border-border bg-panel px-2.5 py-3 font-data text-[12px] text-loss">
          {error}
        </p>
      ) : (
        <ResearchFeed
          items={items}
          viewerVotes={viewerVotes}
          canVote={availableHp >= VOTE_COST_HP}
        />
      )}
    </PageFrame>
  );
}
