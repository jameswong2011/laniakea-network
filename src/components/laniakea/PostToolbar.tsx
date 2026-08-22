"use client";

import { useEffect, useRef, useState } from "react";
import {
  togglePostSubscription,
  toggleSavedPost,
} from "@/app/(dashboard)/forum/actions";
import { useSilentRefresh } from "@/lib/ui/silent-refresh";

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
  const refresh = useSilentRefresh();
  const saveLock = useRef(false);
  const followLock = useRef(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(saved);
  const [isSubscribed, setIsSubscribed] = useState(subscribed);

  useEffect(() => {
    setIsSaved(saved);
  }, [saved]);

  useEffect(() => {
    setIsSubscribed(subscribed);
  }, [subscribed]);

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

  async function toggleSave() {
    if (saveLock.current) {
      return;
    }

    saveLock.current = true;
    const previous = isSaved;
    setIsSaved(!previous);
    const form = new FormData();
    form.set("postId", postId);
    await toggleSavedPost(form);
    saveLock.current = false;
    refresh();
  }

  async function toggleFollow() {
    if (isSubscribed == null || followLock.current) {
      return;
    }

    followLock.current = true;
    const previous = isSubscribed;
    setIsSubscribed(!previous);
    const form = new FormData();
    form.set("postId", postId);
    await togglePostSubscription(form);
    followLock.current = false;
    refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
      <button
        type="button"
        onClick={() => void toggleSave()}
        className="rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
      >
        {isSaved ? "Saved" : "Save"}
      </button>
      {isSubscribed == null ? null : (
        <button
          type="button"
          onClick={() => void toggleFollow()}
          className="rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
        >
          {isSubscribed ? "Following" : "Follow thread"}
        </button>
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
