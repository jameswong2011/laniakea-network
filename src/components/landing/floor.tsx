import { FLOOR_RULES } from "@/lib/landing";

export function Floor() {
  return (
    <section id="floor" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">The floor</p>
        <h2 className="mt-4 max-w-2xl font-display text-2xl leading-title text-fg">
          Shared rules for both seats.
        </h2>
        <p className="mt-5 max-w-2xl text-muted">
          The mechanics are the same whether you post or you mainly read.
          Rooms gate the tape. Health Points price speech. Live and ascended
          notes stay on the tape.
        </p>

        <ul className="mt-12 divide-y divide-border border-y border-border">
          {FLOOR_RULES.map((rule, index) => (
            <li
              key={rule.title}
              className="grid gap-3 py-6 md:grid-cols-12 md:items-baseline"
            >
              <span className="font-mono text-xs text-subtle tabular-nums md:col-span-2">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg text-fg md:col-span-3">{rule.title}</h3>
              <p className="text-sm leading-relaxed text-muted md:col-span-7">
                {rule.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
