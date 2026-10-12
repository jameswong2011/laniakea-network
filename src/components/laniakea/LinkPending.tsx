"use client";

import { useLinkStatus } from "next/link";

export function LinkPending() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-current transition-opacity ${
        pending ? "animate-pulse opacity-60" : "opacity-0"
      }`}
    />
  );
}
