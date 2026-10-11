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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void toggleSave()}
        className={`inline-flex h-8 items-center rounded-md border px-3 text-[13px] font-medium ${
          isSaved
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-secondary text-foreground hover:bg-muted"
        }`}
      >
        {isSaved ? "Saved" : "Save"}
      </button>
      {isSubscribed == null ? null : (
        <button
          type="button"
          onClick={() => void toggleFollow()}
          className={`inline-flex h-8 items-center rounded-md border px-3 text-[13px] font-medium ${
            isSubscribed
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-secondary text-foreground hover:bg-muted"
          }`}
        >
          {isSubscribed ? "Following" : "Follow thread"}
        </button>
      )}
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex h-8 items-center rounded-md border border-border bg-secondary px-3 text-[13px] font-medium text-foreground hover:bg-muted"
      >
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
