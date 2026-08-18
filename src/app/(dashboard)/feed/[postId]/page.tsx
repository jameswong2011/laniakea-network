import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageFrame, PageHeading } from "@/components/layout/PageFrame";
import { AuthorLink } from "@/components/laniakea/AuthorLink";
import { CommentThread } from "@/components/laniakea/CommentThread";
import { EditBodyForm } from "@/components/laniakea/EditBodyForm";
import { HealthMeter } from "@/components/laniakea/HealthMeter";
import { MarkdownBody } from "@/components/laniakea/MarkdownBody";
import { PostToolbar } from "@/components/laniakea/PostToolbar";
import { ReactionBar } from "@/components/laniakea/ReactionBar";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { UnlockPostButton } from "@/components/laniakea/UnlockPostButton";
import { VoteControls } from "@/components/laniakea/VoteControls";
import { requireUser } from "@/lib/auth/session";
import { canOpenDesk, deskAccessLabel } from "@/lib/research/access";
import {
  getCommentThread,
  getViewerCommentVotes,
} from "@/lib/research/comments";
import { VOTE_COST_HP } from "@/lib/research/economy";
import { getResearchPostById, getViewerVotes, researchPostPath } from "@/lib/research/feed";
import {
  isPostSubscribed,
  loadReactions,
  loadSavedPostIds,
} from "@/lib/research/forum";
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
    userId,
    tier: deskTier,
    isAdmin: profile?.role === "admin",
  });
  const availableTokens = profile?.utility_tokens ?? 0;

  if (error) {
    return (
      <PageFrame>
        <p className="rounded-xl border border-border bg-panel px-4 py-3 text-[14px] text-loss">
          {error}
        </p>
      </PageFrame>
    );
  }

  if (!item) {
    notFound();
  }

  const locked = !canOpenDesk(item.access);
  const accessLabel = deskAccessLabel(item.access, item.deskTier);

  if (locked) {
    return (
      <PageFrame>
        <PageHeading
          kicker="Thread"
          title={item.title}
          description="This desk is locked. Pay UTL to read and engage, or earn the tier."
          meta={
            <Link
              href="/feed"
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              Back to feed
            </Link>
          }
        />
        <article className="rounded-xl border border-border bg-panel px-5 py-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SubTopicBadge topic={item.sub_topic} />
            {accessLabel ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">
                {accessLabel}
              </span>
            ) : null}
          </div>
          {item.body ? (
            <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          ) : null}
          {item.unlockQuote ? (
            <UnlockPostButton
              postId={item.id}
              access={item.access}
              quote={item.unlockQuote}
              availableTokens={availableTokens}
              layout="block"
            />
          ) : (
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Earn {item.deskTier ? TIER_LABELS[item.deskTier] : "this desk"} to
              open it.
            </p>
          )}
        </article>
      </PageFrame>
    );
  }

  const viewerVotes = await getViewerVotes(supabase, userId, [item.id]);
  const thread = await getCommentThread(supabase, item.id, userId);
  const commentVotes = await getViewerCommentVotes(
    supabase,
    userId,
    thread.comments.map((comment) => comment.id)
  );
  const replyIds = thread.comments.flatMap((comment) =>
    comment.replies.map((reply) => reply.id)
  );
  const [postReactions, commentReactions, replyReactions, savedIds, subscribed] =
    await Promise.all([
      loadReactions(supabase, "post", [item.id], userId),
      loadReactions(
        supabase,
        "comment",
        thread.comments.map((comment) => comment.id),
        userId
      ),
      loadReactions(supabase, "reply", replyIds, userId),
      loadSavedPostIds(supabase, userId, [item.id]),
      isPostSubscribed(supabase, userId, item.id),
    ]);
  const availableHp = profile?.current_hp ?? 0;

  return (
    <PageFrame>
      <PageHeading
        kicker={item.sub_topic || "Thread"}
        title={item.title}
        description="Stake comments to hunt or ascend them. Direct replies are like-only."
        meta={
          <Link
            href="/feed"
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
            Back to feed
          </Link>
        }
      />

      <article className="rounded-xl border border-border bg-panel px-5 py-5">
        <div className="flex items-start gap-5">
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
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SubTopicBadge topic={item.sub_topic} />
              {isAscendedStatus(item.status) ? (
                <span className="rounded-full bg-gain-muted px-2 py-0.5 text-[12px] text-gain">
                  Ascended
                </span>
              ) : null}
              {isHuntedStatus(item.status) ? (
                <span className="rounded-full bg-loss-muted px-2 py-0.5 text-[12px] text-loss">
                  Hunted
                </span>
              ) : null}
              {accessLabel ? (
                <span className="rounded-full bg-warning-muted px-2 py-0.5 text-[12px] text-warning">
                  {accessLabel}
                </span>
              ) : null}
            </div>
            <MarkdownBody source={item.body} />
            {item.author_id === userId ? (
              <EditBodyForm
                kind="post"
                postId={item.id}
                targetId={item.id}
                initialBody={item.body}
                maxLength={20000}
              />
            ) : null}
            {item.unlockQuote ? (
              <div className="mt-4">
                <UnlockPostButton
                  postId={item.id}
                  access={item.access}
                  quote={item.unlockQuote}
                  availableTokens={availableTokens}
                  layout="block"
                />
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <AuthorLink
                  username={item.author?.username}
                  displayName={item.author?.display_name}
                />
                <span className="text-muted-foreground">
                  {format(new Date(item.created_at), "d MMM yyyy")}
                  {item.updated_at !== item.created_at ? " · edited" : ""}
                </span>
              </div>
              <HealthMeter
                currentHealth={item.current_health}
                originalStake={item.original_stake}
                status={item.status}
              />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <ReactionBar
                targetType="post"
                targetId={item.id}
                postId={item.id}
                counts={postReactions[item.id] ?? []}
                canReact={item.access === "full"}
              />
              <PostToolbar
                postId={item.id}
                saved={savedIds.has(item.id)}
                subscribed={subscribed}
                sharePath={researchPostPath(item.id)}
              />
            </div>
          </div>
        </div>
      </article>

      <CommentThread
        postId={item.id}
        comments={thread.comments}
        viewerVotes={commentVotes}
        access={item.access}
        availableHp={availableHp}
        canVote={availableHp >= VOTE_COST_HP}
        postHunted={isHuntedStatus(item.status)}
        missingTable={thread.missingTable}
        error={thread.error}
        viewerId={userId}
        commentReactions={commentReactions}
        replyReactions={replyReactions}
      />
    </PageFrame>
  );
}
