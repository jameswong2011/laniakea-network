"use client";

import { useEffect, useRef, useState } from "react";
import { toggleReaction } from "@/app/(dashboard)/forum/actions";
import {
  REACTION_KEYS,
  REACTION_LABELS,
  type ReactionCount,
  type ReactionKey,
  type ReactionTarget,
} from "@/lib/research/forum";
import { useSilentRefresh } from "@/lib/ui/silent-refresh";

function toggleLocal(
  counts: ReactionCount[],
  key: ReactionKey
): ReactionCount[] {
  const next = counts.map((row) => ({ ...row }));
  const index = next.findIndex((row) => row.key === key);

  if (index === -1) {
    next.push({ key, count: 1, mine: true });
    return next;
  }

  const row = next[index];
  row.mine = !row.mine;
  row.count = Math.max(0, row.count + (row.mine ? 1 : -1));
  return next;
}

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
  const refresh = useSilentRefresh();
  const pending = useRef(new Set<ReactionKey>());
  const [local, setLocal] = useState(counts);

  useEffect(() => {
    setLocal(counts);
  }, [counts]);

  const byKey = new Map(local.map((row) => [row.key, row]));

  async function tap(key: ReactionKey) {
    if (!canReact || pending.current.has(key)) {
      return;
    }

    pending.current.add(key);
    setLocal((current) => toggleLocal(current, key));

    const form = new FormData();
    form.set("targetType", targetType);
    form.set("targetId", targetId);
    form.set("reaction", key);
    form.set("postId", postId);
    await toggleReaction(form);
    pending.current.delete(key);
    refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_KEYS.map((key) => {
        const row = byKey.get(key);
        const count = row?.count ?? 0;
        const mine = row?.mine ?? false;

        return (
          <button
            key={key}
            type="button"
            disabled={!canReact}
            onClick={() => void tap(key)}
            className={`rounded-full border px-2 py-0.5 text-[11px] disabled:opacity-50 ${
              mine
                ? "border-gain/50 bg-gain-muted text-gain"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {REACTION_LABELS[key]}
            {count > 0 ? ` ${count}` : ""}
          </button>
        );
      })}
    </div>
  );
}
