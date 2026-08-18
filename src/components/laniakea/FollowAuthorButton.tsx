"use client";

import { toggleAuthorFollow } from "@/app/(dashboard)/forum/actions";

export function FollowAuthorButton({
  authorId,
  following,
  followerCount,
}: {
  authorId: string;
  following: boolean;
  followerCount: number;
}) {
  return (
    <form action={toggleAuthorFollow} className="flex items-center gap-2">
      <input type="hidden" name="authorId" value={authorId} />
      <button
        type="submit"
        className="rounded-md bg-secondary px-3 py-1.5 text-[13px] text-foreground hover:bg-muted"
      >
        {following ? "Following" : "Follow"}
      </button>
      <span className="text-[12px] text-muted-foreground">
        {followerCount} {followerCount === 1 ? "follower" : "followers"}
      </span>
    </form>
  );
}
