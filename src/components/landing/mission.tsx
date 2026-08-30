import { PROBLEM } from "@/lib/landing";

export function Mission() {
  return (
    <section id="problem" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="section-kicker">{PROBLEM.kicker}</p>
        <h2 className="mt-4 max-w-3xl font-display text-2xl leading-title text-fg">
          {PROBLEM.title}
        </h2>
        <div className="mt-6 max-w-3xl space-y-5 text-muted">
          <p>{PROBLEM.lead}</p>
          <p>{PROBLEM.close}</p>
        </div>
      </div>
    </section>
  );
}
