"use client";

import { useActionState, useState } from "react";
import {
  createReply,
  type ThreadActionState,
} from "@/app/(dashboard)/feed/[postId]/actions";
import { ImageAttachButton } from "@/components/laniakea/ImageAttachButton";
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
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(createReply, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] text-muted-foreground hover:text-foreground"
      >
        Reply
      </button>
    );
  }

  return (
    <form
      key={state.stamp ?? `reply-${commentId}`}
      action={action}
      className="flex w-full max-w-2xl flex-col gap-2"
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="commentId" value={commentId} />
      <textarea
        name="body"
        required
        rows={3}
        maxLength={REPLY_BODY_MAX}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Reply. Markdown and images are welcome."
        className="min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none focus-visible:border-ring"
      />
      <div className="flex flex-wrap items-center gap-2">
        <ImageAttachButton
          disabled={pending}
          onInsert={(markdown) => setBody((current) => `${current}${markdown}`)}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-secondary px-3 py-1.5 text-[13px] text-foreground hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Posting…" : "Reply"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        {state.error ? (
          <p className="text-[12px] text-loss">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
