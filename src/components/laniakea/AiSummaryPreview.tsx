"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const requests = new Map<string, Promise<string | null>>();

function requestSummary(postId: string) {
  const active = requests.get(postId);

  if (active) {
    return active;
  }

  const request = fetch("/api/ai/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId }),
  })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as
        | { brief?: { summary?: string | null } | null }
        | null;
      return response.ok ? payload?.brief?.summary?.trim() || null : null;
    })
    .catch(() => null)
    .then((summary) => {
      if (!summary) {
        requests.delete(postId);
      }
      return summary;
    });

  requests.set(postId, request);
  return request;
}

export function AiSummaryPreview({
  postId,
  summary,
  href,
  generate,
}: {
  postId: string;
  summary?: string | null;
  href?: string;
  generate: boolean;
}) {
  const [saved, setSaved] = useState(summary?.trim() || null);

  useEffect(() => {
    if (saved || !generate) {
      return;
    }

    let active = true;
    void requestSummary(postId).then((next) => {
      if (active && next) {
        setSaved(next);
      }
    });

    return () => {
      active = false;
    };
  }, [generate, postId, saved]);

  const text = saved ?? "AI summary is being written…";
  return href ? (
    <Link href={href} className="hover:text-foreground">
      {text}
    </Link>
  ) : (
    text
  );
}
