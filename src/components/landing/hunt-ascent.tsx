"use client";

import { useMemo, useState } from "react";
import {
  WORKED_ASCENT_LINE,
  WORKED_CONVICTION,
  WORKED_LONG_SHARE,
  WORKED_STAKE,
  landingAscentClaim,
  landingAscentMultiplier,
  landingHuntClaim,
  landingHuntMultiplier,
} from "@/lib/landing";

function formatMult(n: number) {
  return `${n.toFixed(2)}×`;
}

function formatHp(n: number) {
  return `${n.toFixed(1)} HP`;
}

function pathFrom(
  fn: (health: number) => number,
  width: number,
  height: number,
  maxY: number,
  samples = 72
) {
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const health = t * WORKED_ASCENT_LINE;
    const x = t * width;
    const y = height - (fn(health) / maxY) * (height - 8) - 4;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

export function HuntAscent() {
  const [health, setHealth] = useState(WORKED_STAKE);
  const huntM = landingHuntMultiplier(health);
  const ascentM = landingAscentMultiplier(health);
  const huntPayout = landingHuntClaim(health);
  const ascentPayout = landingAscentClaim(health);
  const longSharePct = Math.round(WORKED_LONG_SHARE * 100);

  const curves = useMemo(() => {
    const w = 640;
    const h = 180;
    let maxY = 3.2;
    for (let i = 0; i <= 72; i++) {
      const sample = (i / 72) * WORKED_ASCENT_LINE;
      maxY = Math.max(
        maxY,
        landingHuntMultiplier(sample),
        landingAscentMultiplier(sample)
      );
    }
    return {
      w,
      h,
      maxY,
      hunt: pathFrom(landingHuntMultiplier, w, h, maxY),
      ascent: pathFrom(landingAscentMultiplier, w, h, maxY),
      cursorX: (health / WORKED_ASCENT_LINE) * w,
    };
  }, [health]);

  return (
    <section id="arena" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-12 md:gap-10 md:px-8 md:py-28">
        <div className="md:col-span-5">
          <p className="section-kicker">05 — The arena</p>
          <h2 className="mt-4 font-display text-2xl leading-title text-fg">
            A thesis lives until the room hunts it or lifts it.
          </h2>
          <p className="mt-5 max-w-md text-muted">
            No buzzer. The vote that takes health to zero is a Hunt. The vote
            that takes it to five times stake is an Ascent and freezes the
            book. What you made is set by conviction and the health when you
            voted — not by who shouted last.
          </p>
          <dl className="mt-8 space-y-5">
            <div>
              <dt className="font-mono text-xs tracking-kicker text-dying uppercase">
                Hunt
              </dt>
              <dd className="mt-1 text-sm text-muted">
                Shorts split the stake plus every upvote. Earlier shorts —
                higher health — take more. The author and the longs take
                nothing.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs tracking-kicker text-live uppercase">
                Ascent
              </dt>
              <dd className="mt-1 text-sm text-muted">
                Longs target {longSharePct}% of the downvote pot; the author
                keeps the rest. Earlier longs take more. Over-claim is
                pro-rata.
              </dd>
            </div>
          </dl>
        </div>

        <div className="md:col-span-7">
          <div className="rounded-xl bg-surface p-4 shadow-border md:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="section-kicker">Worked book</p>
              <p className="font-mono text-xs text-subtle tabular-nums">
                Stake {WORKED_STAKE} · conviction {WORKED_CONVICTION}
              </p>
            </div>

            <svg
              viewBox={`0 0 ${curves.w} ${curves.h}`}
              className="w-full overflow-visible"
              role="img"
              aria-label="Hunt and Ascent multipliers across health from zero to five times stake"
            >
              <path
                d={curves.hunt}
                fill="none"
                className="stroke-dying"
                strokeWidth="2"
              />
              <path
                d={curves.ascent}
                fill="none"
                className="stroke-live"
                strokeWidth="2"
              />
              <line
                x1={curves.cursorX}
                x2={curves.cursorX}
                y1="0"
                y2={curves.h}
                className="stroke-fg/30"
                strokeWidth="1"
              />
            </svg>

            <label className="mt-4 block">
              <span className="flex items-center justify-between font-mono text-xs text-subtle">
                <span>Health at vote</span>
                <span className="tabular-nums text-fg">
                  {health} / {WORKED_ASCENT_LINE}
                </span>
              </span>
              <input
                className="desk-range mt-1"
                type="range"
                min={0}
                max={WORKED_ASCENT_LINE}
                value={health}
                onChange={(event) => setHealth(Number(event.target.value))}
              />
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-bg px-4 py-3">
                <p className="font-mono text-xs tracking-kicker text-dying uppercase">
                  Hunt claim
                </p>
                <p className="mt-1 font-display text-xl leading-none text-fg tabular-nums">
                  {formatHp(huntPayout)}
                </p>
                <p className="mt-1 font-mono text-xs text-subtle">
                  {WORKED_CONVICTION} × {formatMult(huntM)}
                </p>
              </div>
              <div className="rounded-md bg-bg px-4 py-3">
                <p className="font-mono text-xs tracking-kicker text-live uppercase">
                  Ascent claim
                </p>
                <p className="mt-1 font-display text-xl leading-none text-fg tabular-nums">
                  {formatHp(ascentPayout)}
                </p>
                <p className="mt-1 font-mono text-xs text-subtle">
                  {WORKED_CONVICTION} × {formatMult(ascentM)}
                </p>
              </div>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-subtle">
              Drag health to see a worked book: {WORKED_STAKE} HP stake,{" "}
              {WORKED_CONVICTION} conviction. Multiples stay continuous from
              floor to ceiling.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
