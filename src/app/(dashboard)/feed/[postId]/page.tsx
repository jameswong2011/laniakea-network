import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { format } from "date-fns";
import { PageFrame, PageHeading } from "@/components/layout/PageFrame";
import { AuthorLink } from "@/components/laniakea/AuthorLink";
import { FollowAuthorButton } from "@/components/laniakea/FollowAuthorButton";
import { CommentThread } from "@/components/laniakea/CommentThread";
import { EditBodyForm } from "@/components/laniakea/EditBodyForm";
import { HealthMeter } from "@/components/laniakea/HealthMeter";
import { AiDock } from "@/components/laniakea/AiDock";
import { MarkdownBody } from "@/components/laniakea/MarkdownBody";
import { PostToolbar } from "@/components/laniakea/PostToolbar";
import { ReactionBar } from "@/components/laniakea/ReactionBar";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { UnlockPostButton } from "@/components/laniakea/UnlockPostButton";
import { VoteControls } from "@/components/laniakea/VoteControls";
import { lockedBrief, storedNoteBrief } from "@/lib/ai/note-brief";
import { requireUser } from "@/lib/auth/session";
import { canOpenDesk, deskAccessRailClass } from "@/lib/research/access";
import {
  getCommentThread,
  getViewerCommentVotes,
} from "@/lib/research/comments";
import { VOTE_COST_HP } from "@/lib/research/economy";
import { getResearchPostById, getViewerVotes, researchPostPath } from "@/lib/research/feed";
import { resumeFrozenPostSettlement } from "@/lib/research/settlement-apply";
import {
  countAuthorFollowers,
  isAuthorFollowed,
  isPostSubscribed,
  loadCommentDraft,
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

const loadNote = cache(async (postId: string) => {
  const { supabase, userId, profile } = await requireUser();
  return getResearchPostById(supabase, postId, {
    userId,
    tier: resolveTier(profile?.tier) ?? "Bronze",
    isAdmin: profile?.role === "admin",
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const { item } = await loadNote(postId);

  return { title: item?.title ?? "Research" };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResearchPostPage({
  params,
  searchParams,
}: PageProps<"/feed/[postId]">) {
  const { postId } = await params;
  const query = await searchParams;
  const focusCommentId = firstParam(query.comment) ?? null;
  const focusReplyId = firstParam(query.reply) ?? null;
  const { supabase, userId, profile } = await requireUser();
  const { item, error } = await loadNote(postId);
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
  const brief = storedNoteBrief(item);

  if (locked) {
    return (
      <PageFrame>
        <PageHeading
          kicker="Thread"
          title={item.title}
          description="This user is locked. Pay UTL to read and engage, or earn the tier."
          meta={
            <Link
              href="/feed"
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              Back to feed
            </Link>
          }
        />
        <article
          className={`rounded-xl border border-border border-l-[3px] bg-panel px-5 py-5 ${deskAccessRailClass(item.access)}`}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SubTopicBadge topic={item.sub_topic} />
            {item.deskTier ? (
              <TierBadge tier={item.deskTier} locked />
            ) : null}
          </div>
          <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground">
            {brief?.summary ?? "AI summary is being written…"}
          </p>
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
              Earn {item.deskTier ? TIER_LABELS[item.deskTier] : "this user"} to
              open it.
            </p>
          )}
        </article>
        <AiDock postId={item.id} locked brief={lockedBrief(brief)} />
      </PageFrame>
    );
  }

  const [viewerVotes, thread, postReactions, savedIds, subscribed, commentDraft, following, followerCount, resume] =
    await Promise.all([
      getViewerVotes(supabase, userId, [item.id]),
      getCommentThread(supabase, item.id, userId),
      loadReactions(supabase, "post", [item.id], userId),
      loadSavedPostIds(supabase, userId, [item.id]),
      isPostSubscribed(supabase, userId, item.id),
      loadCommentDraft(supabase, userId, item.id),
      item.author_id === userId
        ? Promise.resolve(false)
        : isAuthorFollowed(supabase, userId, item.author_id),
      countAuthorFollowers(supabase, item.author_id),
      resumeFrozenPostSettlement(supabase, item),
    ]);
  const commentIds = thread.comments.map((comment) => comment.id);
  const replyIds = thread.comments.flatMap((comment) =>
    comment.replies.map((reply) => reply.id)
  );
  const [commentVotes, commentReactions, replyReactions] = await Promise.all([
    getViewerCommentVotes(supabase, userId, commentIds),
    loadReactions(supabase, "comment", commentIds, userId),
    loadReactions(supabase, "reply", replyIds, userId),
  ]);
  const availableHp = profile?.current_hp ?? 0;
  const bodies: Record<string, ReactNode> = {};

  for (const comment of thread.comments) {
    bodies[comment.id] = <MarkdownBody source={comment.body} />;

    for (const reply of comment.replies) {
      bodies[reply.id] = <MarkdownBody source={reply.body} />;
    }
  }

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

      {resume.error ? (
        <p className="rounded-xl border border-border bg-panel px-4 py-3 text-[14px] text-warning">
          Note is closed, but bounty is still unpaid. {resume.error}
        </p>
      ) : null}

      <article
        className={`rounded-xl border border-border border-l-[3px] bg-panel px-5 py-5 ${deskAccessRailClass(item.access)}`}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="order-2 flex items-end justify-between gap-3 border-t border-border pt-3 md:order-1 md:block md:border-t-0 md:pt-0">
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
            <div className="md:hidden">
              <HealthMeter
                currentHealth={item.current_health}
                originalStake={item.original_stake}
                status={item.status}
              />
            </div>
          </div>
          <div className="order-1 min-w-0 flex-1 md:order-2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SubTopicBadge topic={item.sub_topic} />
              {item.deskTier ? (
                <TierBadge
                  tier={item.deskTier}
                  locked={item.access === "hidden"}
                />
              ) : null}
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
                  avatarUrl={item.author?.avatar_url}
                />
                <span className="text-muted-foreground">
                  {format(new Date(item.created_at), "d MMM yyyy")}
                  {item.updated_at !== item.created_at ? " · edited" : ""}
                </span>
                {item.author_id !== userId ? (
                  <FollowAuthorButton
                    authorId={item.author_id}
                    following={following}
                    followerCount={followerCount}
                  />
                ) : null}
              </div>
              <div className="hidden md:block">
                <HealthMeter
                  currentHealth={item.current_health}
                  originalStake={item.original_stake}
                  status={item.status}
                />
              </div>
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

      <AiDock postId={item.id} brief={brief} />

      <CommentThread
        postId={item.id}
        comments={thread.comments}
        bodies={bodies}
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
        focusCommentId={focusCommentId}
        focusReplyId={focusReplyId}
        commentDraft={commentDraft}
      />
    </PageFrame>
  );
}
