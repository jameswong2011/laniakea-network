"use client";

import { useState } from "react";
import Link from "next/link";
import { AskNote } from "@/components/laniakea/AskNote";
import { CommentBriefCard } from "@/components/laniakea/CommentBriefCard";
import { NoteBriefCard } from "@/components/laniakea/NoteBriefCard";
import type { CommentBrief } from "@/lib/ai/comment-brief";
import type { MeaningHit } from "@/lib/ai/meaning-search";
import type { NoteBrief } from "@/lib/ai/note-brief";
import { researchPostPath } from "@/lib/research/feed";

export function AiDock({
  postId,
  locked = false,
  brief = null,
  commentBrief = null,
  meaning = null,
}: {
  postId?: string;
  locked?: boolean;
  brief?: NoteBrief | null;
  commentBrief?: CommentBrief | null;
  meaning?: MeaningHit[] | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div className="max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-border bg-panel p-4 shadow-lg">
          {postId && !brief ? (
            <p className="mb-4 text-[14px] text-muted-foreground">
              Summary, claims, and risks show here after this note is opened.
            </p>
          ) : null}
          {brief ? <NoteBriefCard brief={brief} locked={locked} /> : null}
          {postId ? <AskNote postId={postId} locked={locked} /> : null}
          {postId && !commentBrief ? (
            <p className="mb-4 text-[14px] text-muted-foreground">
              Agreement and objection show here after three comments.
            </p>
          ) : null}
          {commentBrief ? <CommentBriefCard brief={commentBrief} /> : null}
          {meaning ? (
            <div className="flex flex-col gap-3">
              <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                By meaning
              </p>
              {meaning.length === 0 ? (
                <p className="text-[14px] text-muted-foreground">
                  Ask a question, or use three or more words, to search the summaries.
                </p>
              ) : (
                meaning.map((post) => (
                  <article key={post.id}>
                    <h2 className="text-[16px] font-medium">
                      <Link href={researchPostPath(post.id)} className="hover:underline">
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{post.summary}</p>
                  </article>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close assistant" : "Open assistant"}
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-[15px] font-semibold text-background shadow-lg"
      >
        AI
      </button>
    </div>
  );
}
