"use client";

import { useRef, useState } from "react";
import { toggleAuthorFollow } from "@/app/(dashboard)/forum/actions";

export function FollowAuthorButton({
  authorId,
  following,
  followerCount,
  showCount = true,
}: {
  authorId: string;
  following: boolean;
  followerCount: number;
  showCount?: boolean;
}) {
  const lock = useRef(false);
  const [isFollowing, setIsFollowing] = useState(following);
  const [count, setCount] = useState(followerCount);
  const [synced, setSynced] = useState({ following, followerCount });

  if (synced.following !== following || synced.followerCount !== followerCount) {
    setSynced({ following, followerCount });
    setIsFollowing(following);
    setCount(followerCount);
  }

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
    const saved = await toggleAuthorFollow(form).catch(() => false);
    lock.current = false;

    if (!saved) {
      setIsFollowing(!next);
      setCount((current) => Math.max(0, current + (next ? -1 : 1)));
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void tap()}
        className="rounded-md bg-secondary px-3 py-1.5 text-[13px] text-foreground hover:bg-muted"
      >
        {isFollowing ? "Following user" : "Follow user"}
      </button>
      {showCount ? (
        <span className="text-[12px] text-muted-foreground">
          {count} {count === 1 ? "follower" : "followers"}
        </span>
      ) : null}
    </div>
  );
}
