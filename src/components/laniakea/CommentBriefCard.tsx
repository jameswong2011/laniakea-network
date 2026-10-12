import type { CommentBrief } from "@/lib/ai/comment-brief";

export function CommentBriefCard({ brief }: { brief: CommentBrief }) {
  return (
    <section className="rounded-xl border border-border bg-panel px-4 py-3">
      <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        The thread
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-foreground">
        <span className="text-muted-foreground">Agreement. </span>
        {brief.agreement}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-foreground">
        <span className="text-muted-foreground">Objection. </span>
        {brief.objection}
      </p>
    </section>
  );
}
