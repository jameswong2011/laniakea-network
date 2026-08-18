import { FLOOR_TRAITS, INCENTIVE_POINTS } from "@/lib/landing";

export function Floor() {
  return (
    <section id="floor" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">02 — The floor</p>
        <h2 className="mt-4 max-w-2xl font-display text-2xl leading-title text-fg">
          A research community with a cost of speech. Not another club with a
          moderator.
        </h2>
        <p className="mt-5 max-w-2xl text-muted">
          Professional research rooms have always failed the same two tests:
          who decides what is good, and why a great book would post. We do not
          solve that with staff. We solve it with scarce HP, public health, and
          a desk you can lose.
        </p>

        <ul className="mt-12 divide-y divide-border border-y border-border">
          {FLOOR_TRAITS.map((trait, index) => (
            <li
              key={trait.title}
              className="grid gap-3 py-6 md:grid-cols-12 md:items-baseline"
            >
              <span className="font-mono text-xs text-subtle tabular-nums md:col-span-2">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg text-fg md:col-span-3">{trait.title}</h3>
              <p className="text-sm leading-relaxed text-muted md:col-span-7">
                {trait.body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {INCENTIVE_POINTS.map((point) => (
            <article key={point.title}>
              <h3 className="font-display text-xl leading-title text-fg">
                {point.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {point.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
