import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HP_RULES } from "@/lib/landing";

export function Rulebook() {
  return (
    <section id="mechanisms" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-12 md:px-8 md:py-28">
        <div className="md:col-span-5">
          <p className="section-kicker">04 — The book</p>
          <h2 className="mt-4 font-display text-2xl leading-title text-fg">
            HP is inventory. You spend it to speak.
          </h2>
          <p className="mt-5 max-w-md text-muted">
            Not a score. Not a streak. You start with a grant, stake it on a
            note or a comment, and spend it to vote. The weekly drain and the
            Monday sweep keep the room from filling with dead inventory.
          </p>
        </div>
        <div className="md:col-span-7">
          <dl className="rounded-xl bg-surface shadow-border">
            {HP_RULES.map((row, i) => (
              <div
                key={row.label}
                className={
                  i === 0
                    ? "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3.5"
                    : "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-border px-5 py-3.5"
                }
              >
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className="font-mono text-sm text-fg tabular-nums">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function Close() {
  return (
    <section id="access" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <p className="section-kicker">Request</p>
        <h2 className="mt-4 max-w-3xl font-display text-3xl leading-display text-fg">
          Help the people who can still generate alpha find the capital.
        </h2>
        <p className="mt-6 max-w-xl text-muted">
          The opacity setting on this industry is maxed. The talent is about
          to be freed. Request a seat — publish, vote, and sit in the
          allocation, not outside it.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="tap-scale inline-flex h-12 items-center gap-2 rounded-sm bg-accent px-6 text-sm font-medium text-accent-fg hover:bg-fg"
          >
            Request access
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
