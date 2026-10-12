"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AskNote } from "@/components/laniakea/AskNote";
import { NoteBriefCard } from "@/components/laniakea/NoteBriefCard";
import { wantsMeaningSearch } from "@/lib/ai/meaning-query";
import type { MeaningHit } from "@/lib/ai/meaning-search";
import type { NoteBrief } from "@/lib/ai/note-brief";
import { researchPostPath } from "@/lib/research/feed";

type MeaningResult = { hits: MeaningHit[]; error: string | null };
type BriefResult = { brief: NoteBrief | null; error: string | null };

const MEANING_TTL_MS = 10 * 60 * 1000;
const meaningCache = new Map<string, { at: number; hits: MeaningHit[] }>();

async function loadMeaning(query: string): Promise<MeaningResult> {
  const key = query.toLowerCase();
  const cached = meaningCache.get(key);

  if (cached && Date.now() - cached.at < MEANING_TTL_MS) {
    return { hits: cached.hits, error: null };
  }

  try {
    const response = await fetch("/api/ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { hits?: MeaningHit[]; error?: string }
      | null;

    if (!response.ok || !payload?.hits) {
      return { hits: [], error: payload?.error ?? "Search by meaning is unavailable right now." };
    }

    meaningCache.set(key, { at: Date.now(), hits: payload.hits });
    return { hits: payload.hits, error: null };
  } catch {
    return { hits: [], error: "Search by meaning is unavailable right now." };
  }
}

async function loadBrief(postId: string): Promise<BriefResult> {
  try {
    const response = await fetch("/api/ai/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { brief?: NoteBrief | null; error?: string }
      | null;

    if (!response.ok) {
      return {
        brief: null,
        error: payload?.error ?? "The AI summary is unavailable right now.",
      };
    }

    return { brief: payload?.brief ?? null, error: payload?.error ?? null };
  } catch {
    return { brief: null, error: "The AI summary is unavailable right now." };
  }
}

export function AiDock({
  postId,
  locked = false,
  brief = null,
  meaningQuery = null,
}: {
  postId?: string;
  locked?: boolean;
  brief?: NoteBrief | null;
  meaningQuery?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [lift, setLift] = useState(0);
  const [loadedBrief, setLoadedBrief] = useState<{ postId: string; brief: NoteBrief } | null>(null);
  const [briefLoadingFor, setBriefLoadingFor] = useState<string | null>(null);
  const [briefFailure, setBriefFailure] = useState<{ postId: string; error: string } | null>(null);
  const [reply, setReply] = useState<{ text: string; section: string | null } | null>(null);
  const [found, setFound] = useState<(MeaningResult & { query: string }) | null>(null);
  const askFocused = useRef(false);
  const requestedBriefFor = useRef<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const query = meaningQuery?.trim() ?? "";
  const wantsMeaning = wantsMeaningSearch(query);
  const meaning = found && found.query === query ? found : null;
  const shownBrief =
    loadedBrief && loadedBrief.postId === postId ? loadedBrief.brief : brief;
  const briefLoading = briefLoadingFor === postId;
  const briefError =
    briefFailure && briefFailure.postId === postId ? briefFailure.error : null;

  useEffect(() => {
    if (!open || !wantsMeaning) {
      return;
    }

    let active = true;
    void loadMeaning(query).then((result) => {
      if (active) {
        setFound({ query, ...result });
      }
    });
    return () => {
      active = false;
    };
  }, [open, query, wantsMeaning]);

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
          {postId && !shownBrief ? (
            <section className="rounded-xl border border-gain/40 bg-gain-muted px-4 py-3">
              <p className="font-data text-[10px] tracking-[0.14em] text-gain uppercase">Summary</p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                {briefLoading
                  ? "Writing and saving the AI summary…"
                  : briefError ?? "The AI summary is still being written."}
              </p>
            </section>
          ) : null}
          {shownBrief ? <NoteBriefCard brief={shownBrief} locked={locked} /> : null}
          {meaningQuery != null ? (
            <div className="flex flex-col gap-3">
              <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                By meaning
              </p>
              {!wantsMeaning ? (
                <p className="text-[14px] text-muted-foreground">
                  Ask a question, or use three or more words, to search the summaries.
                </p>
              ) : !meaning ? (
                <p className="text-[14px] text-muted-foreground">Reading the summaries…</p>
              ) : meaning.error ? (
                <p className="text-[14px] text-muted-foreground">{meaning.error}</p>
              ) : meaning.hits.length === 0 ? (
                <p className="text-[14px] text-muted-foreground">No summaries match this yet.</p>
              ) : (
                meaning.hits.map((post) => (
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
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && postId) {
            void refreshBrief(postId);
          }
        }}
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-black shadow-[0_0_16px_5px_rgba(168,168,176,0.45)]"
      >
        <Image src="/bot-stars.jpg" alt="" width={56} height={56} className="h-full w-full object-cover" />
      </button>
    </div>
  );

  async function refreshBrief(id: string) {
    if (requestedBriefFor.current === id) {
      return;
    }

    requestedBriefFor.current = id;
    setBriefLoadingFor(id);
    setBriefFailure(null);
    let result = await loadBrief(id);

    for (
      let attempt = 0;
      !result.brief &&
      result.error?.includes("still being written") &&
      attempt < 5;
      attempt += 1
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      result = await loadBrief(id);
    }

    setBriefLoadingFor(null);

    if (result.brief) {
      setLoadedBrief({ postId: id, brief: result.brief });
      return;
    }

    requestedBriefFor.current = null;
    setBriefFailure({
      postId: id,
      error: result.error ?? "The AI summary is still being written.",
    });
  }
}
