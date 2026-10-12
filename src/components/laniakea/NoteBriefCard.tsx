import type { NoteBrief } from "@/lib/ai/note-brief";

export function NoteBriefCard({
  brief,
  locked = false,
}: {
  brief: NoteBrief;
  locked?: boolean;
}) {
  return (
    <section className="rounded-xl border border-gain/40 bg-gain-muted px-4 py-3">
      <p className="font-data text-[10px] tracking-[0.14em] text-gain uppercase">
        Summary
      </p>
      {brief.ticker || brief.conviction ? (
        <p className="font-data text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {[brief.ticker, brief.conviction].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      <p className="mt-1 text-[15px] leading-relaxed text-foreground">{brief.summary}</p>
      {!locked && brief.claims.length > 0 ? (
        <div className="mt-3">
          <p className="text-[12px] font-medium text-muted-foreground">Claims</p>
          <ul className="mt-1 list-disc pl-4 text-[14px] leading-relaxed text-foreground">
            {brief.claims.map((claim) => (
              <li key={claim}>{claim}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {!locked && brief.risks.length > 0 ? (
        <div className="mt-3">
          <p className="text-[12px] font-medium text-muted-foreground">Risks</p>
          <ul className="mt-1 list-disc pl-4 text-[14px] leading-relaxed text-foreground">
            {brief.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {brief.agreement ? (
        <p className="mt-3 text-[14px] leading-relaxed text-foreground">
          <span className="font-medium text-warning">Agreement. </span>
          {brief.agreement}
        </p>
      ) : null}
      {brief.objection ? (
        <p className="mt-2 text-[14px] leading-relaxed text-foreground">
          <span className="font-medium text-loss">Objection. </span>
          {brief.objection}
        </p>
      ) : null}
    </section>
  );
}
