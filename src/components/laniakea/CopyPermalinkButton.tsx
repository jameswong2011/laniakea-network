"use client";

import { useState } from "react";

export function CopyPermalinkButton({
  path,
  label = "Link",
}: {
  path: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url =
      typeof window === "undefined" ? path : `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-[12px] text-muted-foreground hover:text-foreground"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
