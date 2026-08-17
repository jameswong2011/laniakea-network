import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageFrame, PageHeading } from "@/components/layout/PageFrame";
import { CommentThread } from "@/components/laniakea/CommentThread";
import { HealthMeter } from "@/components/laniakea/HealthMeter";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { VoteControls } from "@/components/laniakea/VoteControls";
import { requireUser } from "@/lib/auth/session";
import {
  getCommentThread,
  getViewerCommentVotes,
} from "@/lib/research/comments";
import { VOTE_COST_HP } from "@/lib/research/economy";
import { getResearchPostById, getViewerVotes } from "@/lib/research/feed";
import {
  isAscendedStatus,
  isHuntedStatus,
} from "@/lib/research/health";
import {
  RESEARCH_POST_STATUS_LIVE,
  TIER_LABELS,
  resolveTier,
} from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const { supabase, profile } = await requireUser();
  const deskTier = resolveTier(profile?.tier) ?? "Bronze";
  const { item } = await getResearchPostById(supabase, postId, {
    tier: deskTier,
    isAdmin: profile?.role === "admin",
  });

  return { title: item?.title ?? "Research" };
}

export default async function ResearchPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const { supabase, userId, profile } = await requireUser();
  const deskTier = resolveTier(profile?.tier) ?? "Bronze";
  const { item, error } = await getResearchPostById(supabase, postId, {
    tier: deskTier,
    isAdmin: profile?.role === "admin",
  });

  if (error) {
    return (
      <PageFrame>
        <p className="border border-border bg-panel px-2.5 py-3 font-data text-[12px] text-loss">
          {error}
        </p>
      </PageFrame>
    );
  }

  if (!item) {
    notFound();
  }

  const viewerVotes = await getViewerVotes(supabase, userId, [item.id]);
  const thread = await getCommentThread(supabase, item.id, userId);
  const commentVotes = await getViewerCommentVotes(
    supabase,
    userId,
    thread.comments.map((comment) => comment.id)
  );
  const availableHp = profile?.current_hp ?? 0;

  return (
    <PageFrame>
      <PageHeading
        kicker="Thread"
        title={item.title}
        description="Stake comments to hunt or ascend them. Direct replies are like-only."
        meta={
          <Link
            href="/feed"
            className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground"
          >
            Back to feed
          </Link>
        }
      />

      <article className="border border-border bg-panel">
        <div className="flex items-start justify-between gap-3 border-b border-border px-2.5 py-2.5">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <SubTopicBadge topic={item.sub_topic} />
              {isAscendedStatus(item.status) ? (
                <span className="inline-flex h-6 items-center border border-gain/40 bg-gain-muted px-1.5 font-data text-[9px] tracking-[0.12em] text-gain uppercase">
                  Ascended
                </span>
              ) : null}
              {isHuntedStatus(item.status) ? (
                <span className="inline-flex h-6 items-center border border-loss/40 bg-loss-muted px-1.5 font-data text-[9px] tracking-[0.12em] text-loss uppercase">
                  Hunted
                </span>
              ) : null}
              {item.access === "view_only" ? (
                <span className="inline-flex h-6 items-center border border-warning/40 bg-warning-muted px-1.5 font-data text-[9px] tracking-[0.12em] text-warning uppercase">
                  View only
                  {item.deskTier ? ` · ${TIER_LABELS[item.deskTier]} desk` : ""}
                </span>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
              {item.body}
            </p>
          </div>
          <HealthMeter
            currentHealth={item.current_health}
            originalStake={item.original_stake}
            status={item.status}
          />
        </div>
        <div className="flex items-end justify-between gap-3 px-2.5 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {item.authorTopicTier ? (
              <TierBadge tier={item.authorTopicTier} />
            ) : item.author ? (
              <TierBadge tier={item.author.tier} />
            ) : null}
            <span className="font-data text-[12px] text-foreground">
              {item.author?.display_name ?? "Unknown"}
            </span>
            <span className="font-data text-[11px] text-muted-foreground">
              @{item.author?.username ?? "—"}
            </span>
            <span className="font-data text-[10px] text-muted-foreground">
              {format(new Date(item.created_at), "dd MMM yyyy HH:mm")}
            </span>
          </div>
          <VoteControls
            postId={item.id}
            currentVote={viewerVotes[item.id] ?? null}
            canVote={
              availableHp >= VOTE_COST_HP &&
              item.access === "full" &&
              item.status === RESEARCH_POST_STATUS_LIVE
            }
            availableHp={availableHp}
            lockReason={
              isAscendedStatus(item.status)
                ? "Ascended"
                : isHuntedStatus(item.status)
                  ? "Hunted"
                  : item.access === "view_only"
                    ? "View only"
                    : undefined
            }
          />
        </div>
      </article>

      <CommentThread
        postId={item.id}
        comments={thread.comments}
        viewerVotes={commentVotes}
        access={item.access}
        availableHp={availableHp}
        canVote={availableHp >= VOTE_COST_HP}
        missingTable={thread.missingTable}
        error={thread.error}
      />
    </PageFrame>
  );
}
