"use client";

import { useRef, useState } from "react";
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
  const saveLock = useRef(false);
  const followLock = useRef(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(saved);
  const [isSubscribed, setIsSubscribed] = useState(subscribed);
  const [synced, setSynced] = useState({ saved, subscribed });

  if (synced.saved !== saved || synced.subscribed !== subscribed) {
    setSynced({ saved, subscribed });
    setIsSaved(saved);
    setIsSubscribed(subscribed);
  }

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
    const saved = await toggleSavedPost(form).catch(() => false);
    saveLock.current = false;

    if (!saved) {
      setIsSaved(previous);
    }
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
    const saved = await togglePostSubscription(form).catch(() => false);
    followLock.current = false;

    if (!saved) {
      setIsSubscribed(previous);
    }
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
