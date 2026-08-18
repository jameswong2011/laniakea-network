"use client";

import { toggleReaction } from "@/app/(dashboard)/forum/actions";
import {
  REACTION_KEYS,
  REACTION_LABELS,
  type ReactionCount,
  type ReactionTarget,
} from "@/lib/research/forum";

export function ReactionBar({
  targetType,
  targetId,
  postId,
  counts,
  canReact = true,
}: {
  targetType: ReactionTarget;
  targetId: string;
  postId: string;
  counts: ReactionCount[];
  canReact?: boolean;
}) {
  const byKey = new Map(counts.map((row) => [row.key, row]));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_KEYS.map((key) => {
        const row = byKey.get(key);
        const count = row?.count ?? 0;
        const mine = row?.mine ?? false;

        return (
          <form key={key} action={toggleReaction}>
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />
            <input type="hidden" name="reaction" value={key} />
            <input type="hidden" name="postId" value={postId} />
            <button
              type="submit"
              disabled={!canReact}
              className={`rounded-full border px-2 py-0.5 text-[11px] disabled:opacity-50 ${
                mine
                  ? "border-gain/50 bg-gain-muted text-gain"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {REACTION_LABELS[key]}
              {count > 0 ? ` ${count}` : ""}
            </button>
          </form>
        );
      })}
    </div>
  );
}
