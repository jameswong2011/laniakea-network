"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AskNote } from "@/components/laniakea/AskNote";
import { NoteBriefCard } from "@/components/laniakea/NoteBriefCard";
import type { MeaningHit } from "@/lib/ai/meaning-search";
import type { NoteBrief } from "@/lib/ai/note-brief";
import { researchPostPath } from "@/lib/research/feed";

export function AiDock({
  postId,
  locked = false,
  brief = null,
  meaning = null,
}: {
  postId?: string;
  locked?: boolean;
  brief?: NoteBrief | null;
  meaning?: MeaningHit[] | null;
}) {
  const [open, setOpen] = useState(false);
  const [lift, setLift] = useState(0);
  const [reply, setReply] = useState<{ text: string; section: string | null } | null>(null);
  const askFocused = useRef(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }
    const view = viewport;

    function sync() {
      if (!askFocused.current) {
        setLift(0);
        return;
      }
      const covered = window.innerHeight - view.height - view.offsetTop;
      setLift(Math.max(0, Math.round(covered)));
    }

    view.addEventListener("resize", sync);
    view.addEventListener("scroll", sync);
    return () => {
      view.removeEventListener("resize", sync);
      view.removeEventListener("scroll", sync);
    };
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const replyNode = replyRef.current;
    if (!scroller || !replyNode) {
      return;
    }
    const overflow = replyNode.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom;
    if (overflow > 0) {
      scroller.scrollTop += overflow + 12;
    }
  }, [reply]);

  return (
    <div
      className="fixed right-4 z-40 flex flex-col items-end gap-3"
      style={{ bottom: 16 + lift }}
    >
      {open ? (
        <div
          className="grid w-[min(52rem,calc(100vw-2rem))] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border bg-panel shadow-lg"
          style={{ height: `min(88dvh, calc(100dvh - ${lift + 96}px))` }}
        >
          <div ref={scrollerRef} className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain p-4">
          {postId && !brief ? (
            <section className="rounded-xl border border-gain/40 bg-gain-muted px-4 py-3">
              <p className="font-data text-[10px] tracking-[0.14em] text-gain uppercase">Summary</p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                The note and its comments are summarized here. Agreement and objection appear after three comments.
              </p>
            </section>
          ) : null}
          {brief ? <NoteBriefCard brief={brief} locked={locked} /> : null}
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
          {reply ? (
            <div ref={replyRef} className="rounded-xl border border-foreground/25 bg-background px-4 py-3">
              <p className="font-data text-[10px] tracking-[0.14em] text-foreground uppercase">Answer</p>
              <p className="mt-1 text-[14px] leading-relaxed text-foreground">
                {reply.section ? <span className="text-muted-foreground">{reply.section}. </span> : null}
                {reply.text}
              </p>
            </div>
          ) : null}
          </div>
          {postId ? (
            <div className="shrink-0 border-t border-foreground/20 bg-background px-4 py-3">
              <AskNote
                postId={postId}
                locked={locked}
                onAnswer={setReply}
                onFocusChange={(focused) => {
                  askFocused.current = focused;
                  if (!focused) {
                    setLift(0);
                    return;
                  }
                  const viewport = window.visualViewport;
                  if (!viewport) {
                    return;
                  }
                  const covered = window.innerHeight - viewport.height - viewport.offsetTop;
                  setLift(Math.max(0, Math.round(covered)));
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close assistant" : "Open assistant"}
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-black shadow-[0_0_16px_5px_rgba(168,168,176,0.45)]"
      >
        <img src="/bot-stars.jpg" alt="" className="h-full w-full object-cover" />
      </button>
    </div>
  );
}
