import { SEATS } from "@/lib/landing";

export function Seats() {
  return (
    <section id="seats" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">The two seats</p>
        <h2 className="mt-4 max-w-2xl font-display text-2xl leading-title text-fg">
          Same tape. Different jobs.
        </h2>
        <p className="mt-5 max-w-2xl text-muted">
          Creators originate and judge. Investors read, follow, and unlock.
        </p>

        <div className="mt-14 grid gap-px bg-border md:grid-cols-2">
          {SEATS.map((seat) => (
            <article key={seat.id} className="bg-bg px-6 py-8 md:px-8 md:py-10">
              <p className="section-kicker">{seat.kicker}</p>
              <h3 className="mt-3 font-display text-xl leading-title text-fg">
                {seat.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {seat.lede}
              </p>
              <ul className="mt-8 divide-y divide-border border-t border-border">
                {seat.points.map((point) => (
                  <li key={point.title} className="py-5">
                    <h4 className="text-sm text-fg">{point.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {point.body}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
