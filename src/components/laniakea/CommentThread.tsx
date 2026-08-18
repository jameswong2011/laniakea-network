import { format } from "date-fns";
import { CommentComposer } from "@/components/laniakea/CommentComposer";
import { HealthMeter } from "@/components/laniakea/HealthMeter";
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
}) {
  return (
    <section className="border border-border bg-panel">
      <header className="flex items-center justify-between border-b border-border bg-surface px-2.5 py-1.5">
        <h2 className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Comments
        </h2>
        <span className="font-data text-[11px] text-foreground">
          {comments.length}
        </span>
      </header>

      {missingTable ? (
        <div className="border-b border-border px-2.5 py-2">
          <p className="text-[12px] text-warning">
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
          canStake={access === "full" && !postHunted}
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
        <p className="px-2.5 py-3 font-data text-[12px] text-loss">{error}</p>
      ) : null}

      {comments.length === 0 && !missingTable && !error ? (
        <p className="px-2.5 py-4 font-data text-[12px] text-muted-foreground">
          No comments yet. Stake HP to open a position on this note.
        </p>
      ) : null}

      {comments.map((comment) => {
        const state = getPostHealthState(
          comment.current_health,
          comment.original_stake
        );

        return (
          <article
            key={comment.id}
            className={`border-b border-border border-l-[3px] px-2.5 py-2.5 last:border-b-0 ${healthSurface(state)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 whitespace-pre-wrap text-[13px] leading-snug text-foreground">
                {comment.body}
              </p>
              <HealthMeter
                currentHealth={comment.current_health}
                originalStake={comment.original_stake}
                status={comment.status}
              />
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                {comment.author ? <TierBadge tier={comment.author.tier} /> : null}
                <span className="font-data text-[12px] text-foreground">
                  {comment.author?.display_name ?? "Unknown"}
                </span>
                <span className="font-data text-[11px] text-muted-foreground">
                  @{comment.author?.username ?? "—"}
                </span>
                <span className="font-data text-[10px] text-muted-foreground">
                  {format(new Date(comment.created_at), "dd MMM yyyy HH:mm")}
                </span>
                {isAscendedStatus(comment.status) ? (
                  <span className="font-data text-[9px] tracking-[0.12em] text-gain uppercase">
                    Ascended
                  </span>
                ) : null}
                {isHuntedStatus(comment.status) ? (
                  <span className="font-data text-[9px] tracking-[0.12em] text-loss uppercase">
                    Hunted
                  </span>
                ) : null}
                {isRefundedStatus(comment.status) ? (
                  <span className="font-data text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
                    Refunded
                  </span>
                ) : null}
              </div>
              <VoteControls
                postId={postId}
                commentId={comment.id}
                currentVote={viewerVotes[comment.id] ?? null}
                canVote={
                  canVote &&
                  access === "full" &&
                  !postHunted &&
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

            <div className="mt-2 flex flex-col gap-2 border-t border-border/70 pt-2 pl-3">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex flex-col gap-1">
                  <p className="whitespace-pre-wrap text-[12px] leading-snug text-foreground">
                    {reply.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {reply.author ? (
                      <TierBadge tier={reply.author.tier} />
                    ) : null}
                    <span className="font-data text-[11px] text-foreground">
                      {reply.author?.display_name ?? "Unknown"}
                    </span>
                    <span className="font-data text-[10px] text-muted-foreground">
                      @{reply.author?.username ?? "—"}
                    </span>
                    <span className="font-data text-[10px] text-muted-foreground">
                      {format(new Date(reply.created_at), "dd MMM yyyy HH:mm")}
                    </span>
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
          </article>
        );
      })}
    </section>
  );
}
