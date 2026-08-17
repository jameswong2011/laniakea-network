import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HP_RULES, LANDING_TIERS, LAYERS, LIFECYCLE, TOPICS } from "@/lib/landing";

export function Manifesto() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">01 — The floor</p>
        <div className="mt-4 grid gap-10 md:grid-cols-12">
          <h2 className="font-display text-2xl leading-title text-fg md:col-span-5">
            A research floor, not a feed.
          </h2>
          <div className="md:col-span-7">
            <p className="max-w-xl text-muted">
              Most market forums optimize for volume. Laniakea optimizes for
              costly speech. Users consume, produce, and compete on investment
              research. HP is the scarce resource that makes quality expensive
              and attention honest.
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              <Pillar
                title="Consume"
                body="Long-form notes — title, topic, stake, and a public health bar. Not hot takes."
              />
              <Pillar
                title="Produce"
                body="You stake HP to publish. If the room hunts the note, that stake is in the pot."
              />
              <Pillar
                title="Compete"
                body="Every topic has a ladder. One desk above you is view-only. Further desks are hidden."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-medium text-fg">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

export function Layers() {
  return (
    <section id="mechanisms" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">02 — Four layers</p>
        <h2 className="mt-4 max-w-xl font-display text-2xl leading-title text-fg">
          The product is four stacked books, not a single feed.
        </h2>
        <ol className="mt-12 divide-y divide-border border-y border-border">
          {LAYERS.map((layer) => (
            <li
              key={layer.index}
              className="grid gap-3 py-6 md:grid-cols-12 md:items-baseline"
            >
              <span className="font-mono text-xs text-subtle tabular-nums md:col-span-2">
                {layer.index}
              </span>
              <h3 className="text-lg text-fg md:col-span-3">{layer.title}</h3>
              <p className="text-sm text-muted md:col-span-7">{layer.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HpEconomy() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-12 md:px-8 md:py-28">
        <div className="md:col-span-5">
          <p className="section-kicker">03 — HP economy</p>
          <h2 className="mt-4 font-display text-2xl leading-title text-fg">
            HP is inventory. Not a score. Not a badge.
          </h2>
          <p className="mt-5 max-w-md text-muted">
            You buy it with mock tokens — no real payments. Below Masters you
            convert tokens to HP. Masters can cash out. You stake it on a
            thesis, spend it to vote, and lose it when the room is against
            you.
          </p>
        </div>
        <div className="md:col-span-7">
          <dl className="rounded-xl bg-surface shadow-border">
            {HP_RULES.map((row, i) => (
              <div
                key={row.label}
                className={
                  i === 0
                    ? "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4"
                    : "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-border px-5 py-4"
                }
              >
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className="font-mono text-sm text-fg tabular-nums">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-subtle">
            A live note opens at the stake. Floor is a Hunt. Ceiling is an
            Ascent. Shorts split the hunt pot; longs and the author split the
            ascent pot.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Lifecycle() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">05 — Life of a thesis</p>
        <h2 className="mt-4 max-w-xl font-display text-2xl leading-title text-fg">
          From stake to settlement, the room can see the bar.
        </h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-5">
          {LIFECYCLE.map((step) => (
            <li
              key={step.index}
              className="rounded-lg bg-surface p-5 shadow-border"
            >
              <p className="font-mono text-xs text-subtle">{step.index}</p>
              <h3 className="mt-3 text-base text-fg">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 rounded-xl bg-surface px-5 py-6 shadow-border md:px-8">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="section-kicker">Health on a 100 HP stake (max)</p>
            <p className="font-mono text-xs text-subtle tabular-nums">
              Open 100 · Floor 0 · Ceiling 500
            </p>
          </div>
          <div className="relative h-2 rounded-full bg-elevated">
            <div className="absolute inset-y-0 left-0 w-1/5 rounded-full bg-accent/80" />
            <span className="absolute top-1/2 left-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dying" />
            <span className="absolute top-1/2 left-1/5 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
            <span className="absolute top-1/2 left-full size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-live" />
          </div>
          <div className="mt-3 flex justify-between font-mono text-xs tracking-fine text-subtle uppercase">
            <span>Hunt · 0</span>
            <span>Open · 1×</span>
            <span>Ascent · 5×</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Ranking() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-12 md:px-8 md:py-28">
        <div className="md:col-span-5">
          <p className="section-kicker">06 — Ranking</p>
          <h2 className="mt-4 font-display text-2xl leading-title text-fg">
            Bronze to Masters. Each desk keeps its own book.
          </h2>
          <p className="mt-5 max-w-md text-muted">
            You can be Gold in Technology and Bronze in Macro. Topic rank
            does not travel. There is also an overall desk. Notes from one
            tier above you are view-only. Two or more above are hidden.
          </p>
        </div>
        <ol className="md:col-span-7">
          {LANDING_TIERS.map((tier, i) => (
            <li
              key={tier.name}
              className={
                i === 0
                  ? "grid grid-cols-12 items-baseline gap-4 py-4"
                  : "grid grid-cols-12 items-baseline gap-4 border-t border-border py-4"
              }
            >
              <span className="col-span-2 font-mono text-xs text-subtle tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="col-span-4 text-fg">{tier.name}</span>
              <span className="col-span-6 text-sm text-muted">{tier.access}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Book() {
  return (
    <section id="book" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">07 — The book</p>
        <h2 className="mt-4 max-w-xl font-display text-2xl leading-title text-fg">
          {TOPICS.length} topics. Rank is local.
        </h2>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => (
            <article
              key={topic}
              className="rounded-lg bg-surface p-5 shadow-border"
            >
              <h3 className="text-lg text-fg">{topic}</h3>
              <p className="mt-4 font-mono text-xs text-subtle">
                Topic book · rank does not transfer
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NorthStar() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">08 — North star</p>
        <div className="mt-4 grid gap-10 md:grid-cols-12">
          <h2 className="font-display text-2xl leading-title text-fg md:col-span-5">
            Bloomberg Terminal. Not a social app.
          </h2>
          <div className="max-w-xl text-muted md:col-span-7">
            <p>
              Dark, dense, high-information, professional. The tone is
              confident, precise, and slightly confrontational. The audience
              is serious retail and professional investors.
            </p>
            <p className="mt-4">
              Not a crypto casino. Not a Reddit clone. Not gamified fintech.
              If a surface would look at home on a social network, it does
              not ship.
            </p>
          </div>
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
          The crowd settles the thesis.
        </h2>
        <p className="mt-6 max-w-lg text-muted">
          Laniakea is the ranked arena for investment research. Quality has a
          cost. Conviction has a score. Request a seat on the floor.
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
