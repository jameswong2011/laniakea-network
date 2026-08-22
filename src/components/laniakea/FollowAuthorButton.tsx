"use client";

import { useEffect, useRef, useState } from "react";
import { toggleAuthorFollow } from "@/app/(dashboard)/forum/actions";
import { useSilentRefresh } from "@/lib/ui/silent-refresh";

export function FollowAuthorButton({
  authorId,
  following,
  followerCount,
}: {
  authorId: string;
  following: boolean;
  followerCount: number;
}) {
  const refresh = useSilentRefresh();
  const lock = useRef(false);
  const [isFollowing, setIsFollowing] = useState(following);
  const [count, setCount] = useState(followerCount);

  useEffect(() => {
    setIsFollowing(following);
    setCount(followerCount);
  }, [following, followerCount]);

  async function tap() {
    if (lock.current) {
      return;
    }

    lock.current = true;
    const next = !isFollowing;
    setIsFollowing(next);
    setCount((current) => Math.max(0, current + (next ? 1 : -1)));
    const form = new FormData();
    form.set("authorId", authorId);
    await toggleAuthorFollow(form);
    lock.current = false;
    refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void tap()}
        className="rounded-md bg-secondary px-3 py-1.5 text-[13px] text-foreground hover:bg-muted"
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
      <span className="text-[12px] text-muted-foreground">
        {count} {count === 1 ? "follower" : "followers"}
      </span>
    </div>
  );
}
