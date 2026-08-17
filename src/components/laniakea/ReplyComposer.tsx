"use client";

import { useActionState, useState } from "react";
import {
  createReply,
  type ThreadActionState,
} from "@/app/(dashboard)/feed/[postId]/actions";
import { REPLY_BODY_MAX } from "@/types";

const initialState: ThreadActionState = {};

export function ReplyComposer({
  postId,
  commentId,
}: {
  postId: string;
  commentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createReply, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-data text-[10px] tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground"
      >
        Reply
      </button>
    );
  }

  return (
    <form
      key={state.stamp ?? `reply-${commentId}`}
      action={action}
      className="flex w-full max-w-xl flex-col gap-1.5"
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="commentId" value={commentId} />
      <textarea
        name="body"
        required
        rows={2}
        maxLength={REPLY_BODY_MAX}
        placeholder="Direct reply. No stake, no hunt."
        className="min-h-12 w-full border border-border bg-panel-elevated px-2.5 py-1.5 text-[12px] text-foreground outline-none focus-visible:border-ring"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-6 border border-border px-2 font-data text-[10px] tracking-[0.12em] text-foreground uppercase hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post reply"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-data text-[10px] tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground"
        >
          Cancel
        </button>
        {state.error ? (
          <p className="font-data text-[10px] text-loss">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
