"use client";

import { useActionState, useState } from "react";
import {
  voteOnPost,
  type FeedActionState,
} from "@/app/(dashboard)/feed/actions";
import { voteOnComment } from "@/app/(dashboard)/feed/[postId]/actions";
import { CopyInviteButton } from "@/components/laniakea/CopyInviteButton";
import { voteCostHp } from "@/lib/research/economy";
import {
  VOTE_STRENGTH_MAX,
  VOTE_STRENGTH_MIN,
  voteStrength,
} from "@/types";

const initialState: FeedActionState = {};

const buttonClassName =
  "h-6 border px-2 font-data text-[10px] tracking-[0.12em] uppercase disabled:opacity-40";

export function VoteControls({
  postId,
  commentId,
  currentVote,
  canVote,
  availableHp,
  lockReason,
}: {
  postId: string;
  commentId?: string;
  currentVote: number | null;
  canVote: boolean;
  availableHp: number;
  lockReason?: string;
}) {
  const [state, action, pending] = useActionState(
    commentId ? voteOnComment : voteOnPost,
    initialState
  );
  const maxStrength = Math.min(
    VOTE_STRENGTH_MAX,
    Math.max(VOTE_STRENGTH_MIN, availableHp)
  );
  const [strength, setStrength] = useState(() =>
    Math.min(3, maxStrength)
  );
  const locked = pending || currentVote !== null || !canVote;
  const recorded = currentVote !== null ? voteStrength(currentVote) : null;
  const cost = voteCostHp(strength);

  return (
    <form action={action} className="flex w-[9.5rem] flex-col items-end gap-1">
      <input type="hidden" name="postId" value={postId} />
      {commentId ? (
        <input type="hidden" name="commentId" value={commentId} />
      ) : null}
      <div className="flex w-full items-center gap-1.5">
        <input
          type="range"
          name="strength"
          min={VOTE_STRENGTH_MIN}
          max={locked ? VOTE_STRENGTH_MAX : maxStrength}
          step={1}
          value={recorded ?? strength}
          disabled={locked}
          onChange={(event) => setStrength(Number(event.target.value))}
          className="h-1 w-full cursor-pointer accent-foreground disabled:cursor-default disabled:opacity-40"
        />
        <span className="w-3 text-right font-data text-[11px] text-foreground">
          {recorded ?? strength}
        </span>
      </div>
      <div className="flex w-full justify-between font-data text-[9px] tracking-[0.08em] text-muted-foreground">
        <span>{VOTE_STRENGTH_MIN}</span>
        <span>{VOTE_STRENGTH_MAX}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="submit"
          name="direction"
          value="up"
          disabled={locked}
          className={`${buttonClassName} ${
            currentVote !== null && currentVote > 0
              ? "border-gain text-gain"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Up
        </button>
        <button
          type="submit"
          name="direction"
          value="down"
          disabled={locked}
          className={`${buttonClassName} ${
            currentVote !== null && currentVote < 0
              ? "border-loss text-loss"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Down
        </button>
      </div>
      <p className="font-data text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
        {currentVote !== null
          ? `${currentVote > 0 ? "Up" : "Down"} ${recorded}`
          : canVote
            ? `${cost} HP`
            : lockReason ?? `Need ${VOTE_STRENGTH_MIN} HP`}
      </p>
      {state.error ? (
        <p className="text-right font-data text-[10px] text-loss">
          {state.error}
        </p>
      ) : null}
      {state.voteScaleSql ? (
        <CopyInviteButton value={state.voteScaleSql} label="Copy SQL" />
      ) : null}
    </form>
  );
}
