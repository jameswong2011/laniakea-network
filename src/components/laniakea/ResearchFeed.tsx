import { format } from "date-fns";
import Link from "next/link";
import { AuthorLink } from "@/components/laniakea/AuthorLink";
import { HealthMeter } from "@/components/laniakea/HealthMeter";
import { PostToolbar } from "@/components/laniakea/PostToolbar";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { UnlockPostButton } from "@/components/laniakea/UnlockPostButton";
import { VoteControls } from "@/components/laniakea/VoteControls";
import {
  canOpenDesk,
  canWriteDesk,
  deskAccessRailClass,
} from "@/lib/research/access";
import { researchExcerpt, researchPostPath } from "@/lib/research/feed";
import { isAscendedStatus } from "@/lib/research/health";
import {
  RESEARCH_POST_STATUS_LIVE,
  type ResearchFeedItem,
} from "@/types";

export function ResearchFeed({
  items,
  viewerVotes,
  canVote,
  availableHp,
  availableTokens,
  savedIds,
}: {
  items: ResearchFeedItem[];
  viewerVotes: Record<string, number>;
  canVote: boolean;
  availableHp: number;
  availableTokens: number;
  savedIds: Set<string>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-panel px-5 py-10">
        <p className="text-[15px] text-muted-foreground">No live research yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const open = canOpenDesk(item.access);
        const write = canWriteDesk(item.access);
        const href = researchPostPath(item.id);

        return (
          <article
            key={item.id}
            className={`rounded-xl border border-border border-l-[3px] bg-panel px-4 py-4 ${deskAccessRailClass(item.access)}`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="order-2 flex items-end justify-between gap-3 border-t border-border pt-3 md:order-1 md:block md:border-t-0 md:pt-0">
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
                {open ? (
                  <div className="md:hidden">
                    <HealthMeter
                      currentHealth={item.current_health}
                      originalStake={item.original_stake}
                      status={item.status}
                    />
                  </div>
                ) : null}
              </div>
              <div className="order-1 min-w-0 flex-1 md:order-2">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <SubTopicBadge topic={item.sub_topic} />
                  {item.deskTier ? (
                    <TierBadge
                      tier={item.deskTier}
                      locked={item.access === "hidden"}
                    />
                  ) : null}
                  {isAscendedStatus(item.status) ? (
                    <span className="rounded-full bg-gain-muted px-2 py-0.5 text-[11px] text-gain">
                      Ascended
                    </span>
                  ) : null}
                </div>
                <h2 className="font-heading text-[20px] leading-snug text-foreground">
                  {open ? (
                    <Link href={href} className="hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    <span>{item.title}</span>
                  )}
                </h2>
                {item.body ? (
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {open ? (
                      <Link href={href} className="hover:text-foreground">
                        {researchExcerpt(item.body, 280)}
                      </Link>
                    ) : (
                      researchExcerpt(item.body, 280)
                    )}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  <AuthorLink
                    username={item.author?.username}
                    displayName={item.author?.display_name}
                    avatarUrl={item.author?.avatar_url}
                  />
                  <span className="text-muted-foreground">
                    {format(new Date(item.created_at), "d MMM yyyy")}
                  </span>
                  {open ? (
                    <Link href={href} className="text-muted-foreground hover:text-foreground">
                      {item.commentCount ?? 0} comments
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      {item.commentCount ?? 0} comments · Locked
                    </span>
                  )}
                </div>
                {item.unlockQuote ? (
                  <div className="mt-3">
                    <UnlockPostButton
                      postId={item.id}
                      access={item.access}
                      quote={item.unlockQuote}
                      availableTokens={availableTokens}
                    />
                  </div>
                ) : null}
                {open ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <PostToolbar
                      postId={item.id}
                      saved={savedIds.has(item.id)}
                      sharePath={href}
                    />
                    <div className="hidden md:block">
                      <HealthMeter
                        currentHealth={item.current_health}
                        originalStake={item.original_stake}
                        status={item.status}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
