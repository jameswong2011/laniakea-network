"use client";

import { useActionState } from "react";
import {
  createComment,
  type ThreadActionState,
} from "@/app/(dashboard)/feed/[postId]/actions";
import {
  DEFAULT_COMMENT_STAKE_HP,
  MAX_STAKE_HP,
} from "@/lib/research/economy";
import { COMMENT_BODY_MAX } from "@/types";

const initialState: ThreadActionState = {};

const fieldClassName =
  "w-full border border-border bg-panel-elevated px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring";

export function CommentComposer({
  postId,
  availableHp,
  canStake,
  closedReason,
}: {
  postId: string;
  availableHp: number;
  canStake: boolean;
  closedReason?: string;
}) {
  const [state, action, pending] = useActionState(createComment, initialState);
  const defaultStake =
    availableHp >= DEFAULT_COMMENT_STAKE_HP
      ? DEFAULT_COMMENT_STAKE_HP
      : Math.max(availableHp, 1);

  return (
    <form
      key={state.stamp ?? "new-comment"}
      action={action}
      className="flex flex-col gap-2 border-b border-border p-2.5"
    >
      <input type="hidden" name="postId" value={postId} />
      <label className="flex flex-col gap-1">
        <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Stake a comment
        </span>
        <textarea
          name="body"
          required
          rows={3}
          maxLength={COMMENT_BODY_MAX}
          disabled={!canStake || pending}
          placeholder={
            canStake
              ? "Thesis, objection, or addendum. Stake HP to post."
              : (closedReason ??
                "View-only desk. Comments require a matching or lower-tier book.")
          }
          className={`${fieldClassName} min-h-16 py-2 disabled:opacity-50`}
        />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex w-[8.5rem] flex-col gap-1">
          <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            HP stake
          </span>
          <input
            name="stakeHp"
            type="number"
            min={1}
            max={Math.min(MAX_STAKE_HP, Math.max(availableHp, 1))}
            step={1}
            required
            defaultValue={defaultStake}
            disabled={!canStake || pending}
            className={`${fieldClassName} h-8 font-data disabled:opacity-50`}
          />
        </label>
        <button
          type="submit"
          disabled={!canStake || pending || availableHp < 1}
          className="h-8 border border-border bg-secondary px-3 text-[12px] font-medium tracking-wide text-foreground hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Staking…" : "Post comment"}
        </button>
        <p className="font-data text-[10px] text-muted-foreground uppercase">
          Hunt / ascent same as notes
        </p>
      </div>
      {state.error ? (
        <p className="font-data text-[11px] text-loss">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="font-data text-[11px] text-gain">{state.message}</p>
      ) : null}
    </form>
  );
}
