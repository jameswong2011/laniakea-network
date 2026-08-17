import type { Metadata } from "next";
import { PageFrame, PageHeading } from "@/components/layout/PageFrame";
import { NewResearchForm } from "@/components/laniakea/NewResearchForm";
import { ResearchFeed } from "@/components/laniakea/ResearchFeed";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { nextTier } from "@/lib/research/access";
import { VOTE_COST_HP } from "@/lib/research/economy";
import { getLiveResearchFeed, getViewerVotes } from "@/lib/research/feed";
import { TIER_LABELS, VOTE_STRENGTH_MAX, resolveTier } from "@/types";

export const metadata: Metadata = {
  title: "Feed",
};

export default async function FeedPage() {
  const { supabase, userId, profile } = await requireUser();
  const deskTier = resolveTier(profile?.tier) ?? "Bronze";
  const { items, error } = await getLiveResearchFeed(supabase, {
    tier: deskTier,
    isAdmin: profile?.role === "admin",
  });
  const viewerVotes = await getViewerVotes(
    supabase,
    userId,
    items.map((item) => item.id)
  );
  const availableHp = profile?.current_hp ?? 0;
  const above = nextTier(deskTier);

  return (
    <PageFrame>
      <PageHeading
        kicker="Market"
        title="Research Feed"
        description={
          above
            ? `Publish on the ${TIER_LABELS[deskTier]} desk. ${TIER_LABELS[above]} is view-only. Stake cap 100. Votes 1–${VOTE_STRENGTH_MAX}. Health 0 is hunted off the feed; 5× stake ascends and freezes votes.`
            : `Publish on the ${TIER_LABELS[deskTier]} desk. Stake cap 100. Votes 1–${VOTE_STRENGTH_MAX}. Health 0 is hunted off the feed; 5× stake ascends and freezes votes.`
        }
        meta={
          <>
            <TierBadge tier={deskTier} size="md" />
            <span className="font-data text-[11px] text-muted-foreground">
              {items.length} live
            </span>
          </>
        }
      />

      <NewResearchForm availableHp={availableHp} deskTier={deskTier} />

      {error ? (
        <p className="border border-border bg-panel px-2.5 py-3 font-data text-[12px] text-loss">
          {error}
        </p>
      ) : (
        <ResearchFeed
          items={items}
          viewerVotes={viewerVotes}
          canVote={availableHp >= VOTE_COST_HP}
          availableHp={availableHp}
        />
      )}
    </PageFrame>
  );
}
