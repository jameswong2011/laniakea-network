import { format } from "date-fns";
import { HealthMeter } from "@/components/laniakea/HealthMeter";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { VoteControls } from "@/components/laniakea/VoteControls";
import { getPostHealthState } from "@/lib/research/health";
import type { ResearchFeedItem } from "@/types";

function excerpt(body: string, max = 220) {
  const compact = body.replace(/\s+/g, " ").trim();

  if (compact.length <= max) {
    return compact;
  }

  return `${compact.slice(0, max).trimEnd()}…`;
}

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
}: {
  items: ResearchFeedItem[];
  viewerVotes: Record<string, number>;
  canVote: boolean;
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
        const state = getPostHealthState(item.current_health);

        return (
          <article
            key={item.id}
            className={`border-b border-border border-l-[3px] px-2.5 py-2.5 last:border-b-0 ${healthSurface(state)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[13px] font-medium tracking-tight text-foreground">
                  {item.title}
                </h2>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                  {excerpt(item.body)}
                </p>
              </div>
              <HealthMeter currentHealth={item.current_health} />
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                {item.author ? <TierBadge tier={item.author.tier} /> : null}
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
                canVote={canVote}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
