import type { NoteBrief } from "@/lib/ai/note-brief";

export function NoteBriefCard({
  brief,
  locked = false,
}: {
  brief: NoteBrief;
  locked?: boolean;
}) {
  return (
    <section className="mb-4 rounded-xl border border-border bg-surface px-4 py-3">
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
    </section>
  );
}
