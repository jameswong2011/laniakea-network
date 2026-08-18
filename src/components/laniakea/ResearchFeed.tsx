import { format } from "date-fns";
import Link from "next/link";
import { HealthMeter } from "@/components/laniakea/HealthMeter";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { UnlockPostButton } from "@/components/laniakea/UnlockPostButton";
import { VoteControls } from "@/components/laniakea/VoteControls";
import { canOpenDesk, canWriteDesk, deskAccessLabel } from "@/lib/research/access";
import { researchExcerpt, researchPostPath } from "@/lib/research/feed";
import { getPostHealthState, isAscendedStatus } from "@/lib/research/health";
import {
  RESEARCH_POST_STATUS_LIVE,
  TIER_LABELS,
  type ResearchFeedItem,
} from "@/types";

function healthSurface(state: ReturnType<typeof getPostHealthState>) {
  if (state === "dying") {
    return "border-l-loss bg-loss-muted";
  }

  if (state === "at_risk") {
    return "border-l-warning bg-warning-muted";
  }

  return "border-l-gain bg-gain-muted";
}

export function ResearchFeed({
  items,
  viewerVotes,
  canVote,
  availableHp,
  availableTokens,
}: {
  items: ResearchFeedItem[];
  viewerVotes: Record<string, number>;
  canVote: boolean;
  availableHp: number;
  availableTokens: number;
}) {
  if (items.length === 0) {
    return (
      <div className="border border-border bg-panel px-2.5 py-5">
        <p className="font-data text-[12px] text-muted-foreground">
          No live research.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-border bg-panel">
      {items.map((item) => {
        const state = getPostHealthState(
          item.current_health,
          item.original_stake
        );
        const open = canOpenDesk(item.access);
        const write = canWriteDesk(item.access);
        const accessLabel = deskAccessLabel(item.access, item.deskTier);
        const href = researchPostPath(item.id);

        return (
          <article
            key={item.id}
            className={`border-b border-border border-l-[3px] px-2.5 py-2.5 last:border-b-0 ${healthSurface(state)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <SubTopicBadge topic={item.sub_topic} />
                  {isAscendedStatus(item.status) ? (
                    <span className="inline-flex h-6 items-center border border-gain/40 bg-gain-muted px-1.5 font-data text-[9px] tracking-[0.12em] text-gain uppercase">
                      Ascended
                    </span>
                  ) : null}
                  {accessLabel ? (
                    <span
                      className={`inline-flex h-6 items-center border px-1.5 font-data text-[9px] tracking-[0.12em] uppercase ${
                        item.access === "hidden"
                          ? "border-border bg-panel-elevated text-muted-foreground"
                          : "border-warning/40 bg-warning-muted text-warning"
                      }`}
                    >
                      {accessLabel}
                    </span>
                  ) : null}
                </div>
                <h2 className="text-[13px] font-medium tracking-tight text-foreground">
                  {open ? (
                    <Link href={href} className="hover:text-gain">
                      {item.title}
                    </Link>
                  ) : (
                    <span>{item.title}</span>
                  )}
                </h2>
                {item.body ? (
                  <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                    {open ? (
                      <Link href={href} className="hover:text-foreground">
                        {researchExcerpt(item.body)}
                      </Link>
                    ) : (
                      researchExcerpt(item.body)
                    )}
                  </p>
                ) : null}
                {open ? (
                  <p className="mt-1.5 font-data text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                    <Link href={href} className="hover:text-foreground">
                      {item.commentCount ?? 0} comments · Open thread
                    </Link>
                  </p>
                ) : (
                  <p className="mt-1.5 font-data text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                    {item.commentCount ?? 0} comments · Locked
                  </p>
                )}
                {item.unlockQuote ? (
                  <div className="mt-2">
                    <UnlockPostButton
                      postId={item.id}
                      access={item.access}
                      quote={item.unlockQuote}
                      availableTokens={availableTokens}
                    />
                  </div>
                ) : null}
              </div>
              <HealthMeter
                currentHealth={item.current_health}
                originalStake={item.original_stake}
                status={item.status}
              />
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
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
                  canVote &&
                  write &&
                  item.status === RESEARCH_POST_STATUS_LIVE
                }
                availableHp={availableHp}
                lockReason={
                  isAscendedStatus(item.status)
                    ? "Ascended"
                    : item.access === "hidden"
                      ? "Locked"
                      : item.access === "view_only"
                        ? "View only"
                        : undefined
                }
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
