"use client";

import { useActionState } from "react";
import {
  toggleReplyLike,
  type ThreadActionState,
} from "@/app/(dashboard)/feed/[postId]/actions";

const initialState: ThreadActionState = {};

export function ReplyLikeButton({
  postId,
  replyId,
  likeCount,
  likedByViewer,
}: {
  postId: string;
  replyId: string;
  likeCount: number;
  likedByViewer: boolean;
}) {
  const [state, action, pending] = useActionState(
    toggleReplyLike,
    initialState
  );

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="replyId" value={replyId} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-md px-2 py-0.5 text-[12px] disabled:opacity-50 ${
          likedByViewer
            ? "bg-gain-muted text-gain"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {likedByViewer ? "Liked" : "Like"} {likeCount}
      </button>
      {state.error ? (
        <p className="font-data text-[10px] text-loss">{state.error}</p>
      ) : null}
    </form>
  );
}
