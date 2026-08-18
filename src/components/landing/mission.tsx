import { AUDIENCES } from "@/lib/landing";

export function Mission() {
  return (
    <section id="thesis" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">01 — The name</p>
        <div className="mt-4 grid gap-10 md:grid-cols-12">
          <h2 className="font-display text-2xl leading-title text-fg md:col-span-5">
            Laniakea is the local supercluster — and the time horizon.
          </h2>
          <div className="max-w-xl text-muted md:col-span-7">
            <p>
              The Laniakea Supercluster is home to the Milky Way and roughly a
              hundred thousand nearby galaxies, all on a convergence toward a
              single terminus of the local light cone. The Hawaiian is “open
              skies,” or “immense heaven.”
            </p>
            <p className="mt-4">
              We took the name because it is the longest, most expansive
              horizon we can still point at — the scale you hold while the
              industry measures itself in quarters and lockups.
            </p>
          </div>
        </div>

        <div className="mt-20 grid gap-10 border-t border-border pt-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="section-kicker">02 — The industry</p>
            <h2 className="mt-4 font-display text-2xl leading-title text-fg">
              Discovery in this market is set to maximum opacity.
            </h2>
          </div>
          <div className="max-w-xl text-muted md:col-span-7">
            <p>
              Gatekeepers funnel assets into gatherers. The people who still
              generate alpha walk a gauntlet of compliance and short-horizon,
              misinformed capital. By the time a book is raised, the capacity
              that made it worth raising has often been diluted out of the
              firm.
            </p>
            <p className="mt-4">
              There is still no efficient way to connect providers of capital
              to managers of capital. The first internet wave built two-sided
              networks around every other incumbent. This industry is late —
              and suddenly, the talent side of the market is about to flood.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Wave() {
  return (
    <section id="wave" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">03 — The inversion</p>
        <h2 className="mt-4 max-w-3xl font-display text-2xl leading-title text-fg">
          The research pyramid is about to flip. That is the market.
        </h2>
        <p className="mt-5 max-w-2xl text-muted">
          Anyone who has lived with the last generation of models knows they
          are becoming fully fledged public-market analysts — then better.
          External tools through MCP. Agents that can sit at a machine and
          finish the job. A typical public fund’s 1 / 3–10 / 10–50 stack does
          not survive that. PMs and analysts move toward parity. The surplus
          talent is not junior. It is people who can already run a book.
        </p>

        <div className="mt-14 grid gap-px bg-border md:grid-cols-2">
          {AUDIENCES.map((seat) => (
            <article key={seat.title} className="bg-bg px-6 py-8 md:px-8">
              <p className="section-kicker">{seat.kicker}</p>
              <h3 className="mt-3 font-display text-xl leading-title text-fg">
                {seat.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {seat.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
