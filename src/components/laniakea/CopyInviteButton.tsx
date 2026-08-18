"use client";

import { useState } from "react";

export function CopyInviteButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="h-7 border border-border bg-secondary px-2 font-data text-[10px] tracking-[0.12em] text-foreground uppercase hover:bg-muted"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
