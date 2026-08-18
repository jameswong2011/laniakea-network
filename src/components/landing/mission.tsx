import { AUDIENCES } from "@/lib/landing";

export function Mission() {
  return (
    <section id="thesis" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">01 — The industry</p>
        <h2 className="mt-4 max-w-3xl font-display text-2xl leading-title text-fg">
          Discovery is set to maximum opacity. The research pyramid is about
          to flip.
        </h2>
        <div className="mt-6 grid gap-6 max-w-3xl text-muted md:grid-cols-2">
          <p>
            Gatekeepers funnel assets into gatherers. The people who still
            generate alpha walk a gauntlet of compliance and short-horizon,
            misinformed capital. By the time a book is raised, the capacity
            that made it worth raising has often been diluted out of the firm.
            There is still no efficient way to connect providers of capital to
            managers of capital.
          </p>
          <p>
            The first internet wave built two-sided networks around every other
            incumbent. This industry is late — and the talent side is about to
            flood. Models are becoming A+ public-market analysts. MCP to every
            feed. Agents that can finish the job. A typical fund’s 1 / 3–10 /
            10–50 stack does not survive that. The surplus is not junior. It is
            people who can already run a book.
          </p>
        </div>

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
