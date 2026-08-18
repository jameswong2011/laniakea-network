"use client";

import { useActionState, useState } from "react";
import {
  editCommentBody,
  editPostBody,
  editReplyBody,
  type ForumActionState,
} from "@/app/(dashboard)/forum/actions";
import { ImageAttachButton } from "@/components/laniakea/ImageAttachButton";

const initialState: ForumActionState = {};

export function EditBodyForm({
  kind,
  postId,
  targetId,
  initialBody,
  maxLength,
}: {
  kind: "post" | "comment" | "reply";
  postId: string;
  targetId: string;
  initialBody: string;
  maxLength: number;
}) {
  const action =
    kind === "post"
      ? editPostBody
      : kind === "comment"
        ? editCommentBody
        : editReplyBody;
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] text-muted-foreground hover:text-foreground"
      >
        Edit
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex w-full flex-col gap-2">
      <input type="hidden" name="postId" value={postId} />
      {kind === "comment" ? (
        <input type="hidden" name="commentId" value={targetId} />
      ) : null}
      {kind === "reply" ? (
        <input type="hidden" name="replyId" value={targetId} />
      ) : null}
      <textarea
        name="body"
        required
        rows={kind === "post" ? 8 : 4}
        maxLength={maxLength}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none focus-visible:border-ring"
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
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setBody(initialBody);
            setOpen(false);
          }}
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        {state.error ? (
          <span className="text-[12px] text-loss">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
