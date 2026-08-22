"use client";

import { useEffect, useRef, useState } from "react";
import {
  voteOnPost,
  type FeedActionState,
} from "@/app/(dashboard)/feed/actions";
import { voteOnComment } from "@/app/(dashboard)/feed/[postId]/actions";
import { CopyInviteButton } from "@/components/laniakea/CopyInviteButton";
import { voteCostHp } from "@/lib/research/economy";
import { useSilentRefresh } from "@/lib/ui/silent-refresh";
import {
  VOTE_STRENGTH_MAX,
  VOTE_STRENGTH_MIN,
  signedVoteValue,
  voteStrength,
} from "@/types";

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
  const refresh = useSilentRefresh();
  const inflight = useRef(false);
  const maxStrength = Math.min(
    VOTE_STRENGTH_MAX,
    Math.max(VOTE_STRENGTH_MIN, availableHp)
  );
  const [strength, setStrength] = useState(() => Math.min(3, maxStrength));
  const [recordedVote, setRecordedVote] = useState(currentVote);
  const [state, setState] = useState<FeedActionState>({});

  useEffect(() => {
    if (currentVote !== null) {
      setRecordedVote(currentVote);
    }
  }, [currentVote]);

  const locked = recordedVote !== null || !canVote || inflight.current;
  const recorded = recordedVote !== null ? voteStrength(recordedVote) : null;
  const cost = voteCostHp(strength);

  async function cast(direction: "up" | "down") {
    if (recordedVote !== null || !canVote || inflight.current) {
      return;
    }

    inflight.current = true;
    const value = signedVoteValue(direction, strength);
    setRecordedVote(value);
    setState({});

    const form = new FormData();
    form.set("postId", postId);
    form.set("direction", direction);
    form.set("strength", String(strength));

    if (commentId) {
      form.set("commentId", commentId);
    }

    const result = commentId
      ? await voteOnComment({}, form)
      : await voteOnPost({}, form);

    if (result.error) {
      inflight.current = false;
      setRecordedVote(currentVote);
      setState(result);
      return;
    }

    setState(result);
    refresh();
  }

  return (
    <div className="flex w-[8.75rem] shrink-0 flex-col items-end gap-1 sm:w-[9.5rem]">
      <div className="flex w-full items-center gap-1.5">
        <input
          type="range"
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
          type="button"
          disabled={locked}
          onClick={() => void cast("up")}
          className={`${buttonClassName} ${
            recordedVote !== null && recordedVote > 0
              ? "border-gain text-gain"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Up
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => void cast("down")}
          className={`${buttonClassName} ${
            recordedVote !== null && recordedVote < 0
              ? "border-loss text-loss"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Down
        </button>
      </div>
      <p className="font-data text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
        {recordedVote !== null
          ? `${recordedVote > 0 ? "Up" : "Down"} ${recorded}`
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
    </div>
  );
}
