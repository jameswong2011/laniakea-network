"use client";

import { useEffect, useRef, useState } from "react";
import { toggleReplyLike } from "@/app/(dashboard)/feed/[postId]/actions";
import { useSilentRefresh } from "@/lib/ui/silent-refresh";

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
  const refresh = useSilentRefresh();
  const lock = useRef(false);
  const [liked, setLiked] = useState(likedByViewer);
  const [count, setCount] = useState(likeCount);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setLiked(likedByViewer);
    setCount(likeCount);
  }, [likedByViewer, likeCount]);

  async function tap() {
    if (lock.current) {
      return;
    }

    lock.current = true;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
    setError(undefined);

    const form = new FormData();
    form.set("postId", postId);
    form.set("replyId", replyId);
    const result = await toggleReplyLike({}, form);

    if (result.error) {
      lock.current = false;
      setLiked(likedByViewer);
      setCount(likeCount);
      setError(result.error);
      return;
    }

    lock.current = false;
    refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void tap()}
        className={`rounded-md px-2 py-0.5 text-[12px] ${
          liked
            ? "bg-gain-muted text-gain"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {liked ? "Liked" : "Like"} {count}
      </button>
      {error ? (
        <p className="font-data text-[10px] text-loss">{error}</p>
      ) : null}
    </div>
  );
}
