import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HP_RULES, LAYERS } from "@/lib/landing";

export function Layers() {
  return (
    <section id="mechanisms" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">01 — Four layers</p>
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
          <p className="section-kicker">02 — HP economy</p>
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

export function NorthStar() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">04 — North star</p>
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
