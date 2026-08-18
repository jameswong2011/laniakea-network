"use client";

import { useState } from "react";
import {
  togglePostSubscription,
  toggleSavedPost,
} from "@/app/(dashboard)/forum/actions";

export function PostToolbar({
  postId,
  saved,
  subscribed = null,
  sharePath,
}: {
  postId: string;
  saved: boolean;
  subscribed?: boolean | null;
  sharePath: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url =
      typeof window === "undefined"
        ? sharePath
        : `${window.location.origin}${sharePath}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
      <form action={toggleSavedPost}>
        <input type="hidden" name="postId" value={postId} />
        <button type="submit" className="rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground">
          {saved ? "Saved" : "Save"}
        </button>
      </form>
      {subscribed == null ? null : (
        <form action={togglePostSubscription}>
          <input type="hidden" name="postId" value={postId} />
          <button type="submit" className="rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground">
            {subscribed ? "Following" : "Follow thread"}
          </button>
        </form>
      )}
      <button
        type="button"
        onClick={copyLink}
        className="rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
      >
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
