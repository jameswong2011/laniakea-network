import type { ReactNode } from "react";

const WIDTH = {
  form: "max-w-md",
  narrow: "max-w-3xl",
  default: "max-w-4xl",
  wide: "max-w-5xl",
} as const;

export function PageFrame({
  children,
  width = "default",
}: {
  children: ReactNode;
  width?: keyof typeof WIDTH;
}) {
  return (
    <section
      className={`mx-auto flex w-full ${WIDTH[width]} flex-col gap-3 px-3 py-4`}
    >
      {children}
    </section>
  );
}

export function PageHeading({
  kicker,
  title,
  description,
  meta,
}: {
  kicker: string;
  title: string;
  description?: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
      <div className="min-w-0">
        <p className="font-data text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          {kicker}
        </p>
        <h1 className="text-[15px] font-medium tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {meta ? <div className="flex shrink-0 items-center gap-2">{meta}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border bg-panel ${className}`}>{children}</div>
  );
}

export function PanelHeader({
  label,
  meta,
}: {
  label: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-2.5 py-1.5">
      <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      {meta ? (
        <span className="font-data text-[11px] text-foreground">{meta}</span>
      ) : null}
    </div>
  );
}
