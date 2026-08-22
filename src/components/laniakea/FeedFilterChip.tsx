import Link from "next/link";
import type { ReactNode } from "react";

export function FeedFilterChip({
  href,
  active,
  className,
  onSelect,
  children,
}: {
  href: string;
  active: boolean;
  className: string;
  onSelect?: (href: string) => void;
  children: ReactNode;
}) {
  if (onSelect) {
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onSelect(href)}
        className={className}
      >
        {children}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function FeedFilterGroup({
  label,
  hint,
  tone,
  children,
}: {
  label: string;
  hint: string;
  tone: "outcome" | "desk" | "sector";
  children: ReactNode;
}) {
  const frame =
    tone === "outcome"
      ? "border-border bg-panel"
      : tone === "desk"
        ? "border-border bg-surface"
        : "border-dashed border-border bg-panel-elevated/50";

  return (
    <section className={`rounded-xl border px-3 py-2.5 ${frame}`}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}
