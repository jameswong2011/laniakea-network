"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AuthorLink } from "@/components/laniakea/AuthorLink";
import { CommentComposer } from "@/components/laniakea/CommentComposer";
import { CopyPermalinkButton } from "@/components/laniakea/CopyPermalinkButton";
import { EditBodyForm } from "@/components/laniakea/EditBodyForm";
import { HealthMeter } from "@/components/laniakea/HealthMeter";
import { MarkdownBody } from "@/components/laniakea/MarkdownBody";
import { ReactionBar } from "@/components/laniakea/ReactionBar";
import { ReplyComposer } from "@/components/laniakea/ReplyComposer";
import { ReplyLikeButton } from "@/components/laniakea/ReplyLikeButton";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { VoteControls } from "@/components/laniakea/VoteControls";
import {
  getPostHealthState,
  isAscendedStatus,
  isHuntedStatus,
  isRefundedStatus,
} from "@/lib/research/health";
import {
  COMMENTS_SQL_POLICIES,
  COMMENTS_SQL_TABLES,
} from "@/lib/research/comments-sql";
import {
  researchCommentPath,
  researchReplyPath,
} from "@/lib/research/feed";
import type { ContentDraft, ReactionCount } from "@/lib/research/forum";
import {
  COMMENT_BODY_MAX,
  REPLY_BODY_MAX,
  RESEARCH_POST_STATUS_LIVE,
  type CommentThreadItem,
  type FeedAccess,
} from "@/types";

function healthSurface(state: ReturnType<typeof getPostHealthState>) {
  if (state === "dying") {
    return "border-l-loss";
  }

  if (state === "at_risk") {
    return "border-l-warning";
  }

  return "border-l-gain";
}

export function CommentThread({
  postId,
  comments,
  viewerVotes,
  access,
  availableHp,
  canVote,
  postHunted,
  missingTable,
  error,
  viewerId,
  commentReactions,
  replyReactions,
  focusCommentId = null,
  focusReplyId = null,
  commentDraft = null,
}: {
  postId: string;
  comments: CommentThreadItem[];
  viewerVotes: Record<string, number>;
  access: FeedAccess;
  availableHp: number;
  canVote: boolean;
  postHunted?: boolean;
  missingTable: boolean;
  error: string | null;
  viewerId: string;
  commentReactions: Record<string, ReactionCount[]>;
  replyReactions: Record<string, ReactionCount[]>;
  focusCommentId?: string | null;
  focusReplyId?: string | null;
  commentDraft?: ContentDraft | null;
}) {
  const [sort, setSort] = useState<"top" | "new">("top");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const canWrite = access === "full" && !postHunted;

  useEffect(() => {
    const targetId = focusReplyId
      ? `reply-${focusReplyId}`
      : focusCommentId
        ? `comment-${focusCommentId}`
        : null;

    if (!targetId) {
      return;
    }

    const node = document.getElementById(targetId);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusCommentId, focusReplyId, comments]);

  const ordered = useMemo(() => {
    const next = [...comments];

    if (sort === "new") {
      return next.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return next.sort((a, b) => {
      if (b.current_health !== a.current_health) {
        return b.current_health - a.current_health;
      }

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [comments, sort]);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-panel">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-[16px] font-medium text-foreground">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </h2>
        <div className="flex items-center gap-2 text-[13px]">
          <button
            type="button"
            onClick={() => setSort("top")}
            className={sort === "top" ? "text-foreground" : "text-muted-foreground"}
          >
            Top
          </button>
          <span className="text-border">·</span>
          <button
            type="button"
            onClick={() => setSort("new")}
            className={sort === "new" ? "text-foreground" : "text-muted-foreground"}
          >
            New
          </button>
        </div>
      </header>

      {missingTable ? (
        <div className="border-b border-border px-4 py-3">
          <p className="text-[13px] text-warning">
            Comments need a one-time schema update. Run part 1, then part 2,
            as two separate queries in the Supabase SQL editor.
          </p>
          <pre className="mt-2 max-h-32 overflow-auto bg-panel-elevated p-2 font-data text-[10px] leading-relaxed text-foreground">
            {COMMENTS_SQL_TABLES}
          </pre>
          <pre className="mt-2 max-h-32 overflow-auto bg-panel-elevated p-2 font-data text-[10px] leading-relaxed text-foreground">
            {COMMENTS_SQL_POLICIES}
          </pre>
        </div>
      ) : (
        <CommentComposer
          postId={postId}
          availableHp={availableHp}
          canStake={canWrite}
          draft={commentDraft}
          closedReason={
            postHunted
              ? "This post has been hunted. Comments are closed."
              : access === "view_only"
                ? "View only. Unlock this note with UTL to comment."
                : access === "hidden"
                  ? "This desk is locked. Unlock it with UTL to engage."
                  : undefined
          }
        />
      )}

      {error && !missingTable ? (
        <p className="px-4 py-3 text-[13px] text-loss">{error}</p>
      ) : null}

      {comments.length === 0 && !missingTable && !error ? (
        <p className="px-4 py-6 text-[14px] text-muted-foreground">
          No comments yet. Stake HP to open a position on this note.
        </p>
      ) : null}

      {ordered.map((comment) => {
        const state = getPostHealthState(
          comment.current_health,
          comment.original_stake
        );
        const hidden = collapsed[comment.id];
        const isAuthor = comment.author_id === viewerId;
        const focused =
          comment.id === focusCommentId ||
          comment.replies.some((reply) => reply.id === focusReplyId);

        return (
          <article
            id={`comment-${comment.id}`}
            key={comment.id}
            className={`border-b border-border border-l-2 px-4 py-4 last:border-b-0 ${healthSurface(state)} ${
              focused ? "bg-gain-muted/40" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                  {comment.author ? <TierBadge tier={comment.author.tier} /> : null}
                  <AuthorLink
                    username={comment.author?.username}
                    displayName={comment.author?.display_name}
                  />
                  <span className="text-muted-foreground">
                    {format(new Date(comment.created_at), "d MMM yyyy")}
                  </span>
                  {comment.updated_at !== comment.created_at ? (
                    <span className="text-muted-foreground">edited</span>
                  ) : null}
                  <CopyPermalinkButton
                    path={researchCommentPath(postId, comment.id)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((current) => ({
                        ...current,
                        [comment.id]: !hidden,
                      }))
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {hidden ? "Expand" : "Collapse"}
                  </button>
                </div>
                {hidden ? (
                  <p className="text-[13px] text-muted-foreground">
                    {comment.replies.length} hidden{" "}
                    {comment.replies.length === 1 ? "reply" : "replies"}
                  </p>
                ) : (
                  <>
                    <MarkdownBody source={comment.body} />
                    {isAuthor ? (
                      <EditBodyForm
                        kind="comment"
                        postId={postId}
                        targetId={comment.id}
                        initialBody={comment.body}
                        maxLength={COMMENT_BODY_MAX}
                      />
                    ) : null}
                  </>
                )}
              </div>
              {hidden ? null : (
                <HealthMeter
                  currentHealth={comment.current_health}
                  originalStake={comment.original_stake}
                  status={comment.status}
                />
              )}
            </div>
            {hidden ? null : (
              <>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <ReactionBar
                    targetType="comment"
                    targetId={comment.id}
                    postId={postId}
                    counts={commentReactions[comment.id] ?? []}
                    canReact={access === "full"}
                  />
                  <VoteControls
                    postId={postId}
                    commentId={comment.id}
                    currentVote={viewerVotes[comment.id] ?? null}
                    canVote={
                      canVote &&
                      canWrite &&
                      comment.status === RESEARCH_POST_STATUS_LIVE
                    }
                    availableHp={availableHp}
                    lockReason={
                      isAscendedStatus(comment.status)
                        ? "Ascended"
                        : isHuntedStatus(comment.status)
                          ? "Hunted"
                          : isRefundedStatus(comment.status)
                            ? "Refunded"
                            : access === "view_only"
                              ? "View only"
                              : undefined
                    }
                  />
                </div>
                <div className="mt-4 flex flex-col gap-4 border-l border-border pl-4">
                  {comment.replies.map((reply) => (
                    <div
                      id={`reply-${reply.id}`}
                      key={reply.id}
                      className={`flex flex-col gap-2 rounded-lg ${
                        reply.id === focusReplyId ? "bg-gain-muted/50 p-2" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                        {reply.author ? (
                          <TierBadge tier={reply.author.tier} />
                        ) : null}
                        <AuthorLink
                          username={reply.author?.username}
                          displayName={reply.author?.display_name}
                        />
                        <span className="text-muted-foreground">
                          {format(new Date(reply.created_at), "d MMM yyyy")}
                        </span>
                        <CopyPermalinkButton
                          path={researchReplyPath(postId, comment.id, reply.id)}
                        />
                      </div>
                      <MarkdownBody source={reply.body} />
                      {reply.author_id === viewerId ? (
                        <EditBodyForm
                          kind="reply"
                          postId={postId}
                          targetId={reply.id}
                          initialBody={reply.body}
                          maxLength={REPLY_BODY_MAX}
                        />
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3">
                        <ReactionBar
                          targetType="reply"
                          targetId={reply.id}
                          postId={postId}
                          counts={replyReactions[reply.id] ?? []}
                          canReact={access === "full"}
                        />
                        <ReplyLikeButton
                          postId={postId}
                          replyId={reply.id}
                          likeCount={reply.likeCount}
                          likedByViewer={reply.likedByViewer}
                        />
                      </div>
                    </div>
                  ))}
                  {access === "full" ? (
                    <ReplyComposer postId={postId} commentId={comment.id} />
                  ) : null}
                </div>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}
