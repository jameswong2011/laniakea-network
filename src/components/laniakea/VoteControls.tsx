"use client";

import { useActionState } from "react";
import {
  voteOnPost,
  type FeedActionState,
} from "@/app/(dashboard)/feed/actions";
import { VOTE_COST_HP } from "@/lib/research/economy";
import { VOTE_DOWN, VOTE_UP } from "@/types";

const initialState: FeedActionState = {};

const buttonClassName =
  "h-6 border px-2 font-data text-[10px] tracking-[0.12em] uppercase disabled:opacity-40";

export function VoteControls({
  postId,
  currentVote,
  canVote,
}: {
  postId: string;
  currentVote: number | null;
  canVote: boolean;
}) {
  const [state, action, pending] = useActionState(voteOnPost, initialState);
  const locked = pending || currentVote !== null || !canVote;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <form action={action}>
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="value" value={VOTE_UP} />
          <button
            type="submit"
            disabled={locked}
            className={`${buttonClassName} ${
              currentVote === VOTE_UP
                ? "border-gain text-gain"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Up
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="value" value={VOTE_DOWN} />
          <button
            type="submit"
            disabled={locked}
            className={`${buttonClassName} ${
              currentVote === VOTE_DOWN
                ? "border-loss text-loss"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Down
          </button>
        </form>
      </div>
      <p className="font-data text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
        {currentVote !== null
          ? "Vote recorded"
          : canVote
            ? `${VOTE_COST_HP} HP`
            : "Need 1 HP"}
      </p>
      {state.error ? (
        <p className="font-data text-[10px] text-loss">{state.error}</p>
      ) : null}
    </div>
  );
}
