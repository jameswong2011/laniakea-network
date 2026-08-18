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
      className={`mx-auto flex w-full ${WIDTH[width]} flex-col gap-5 px-4 py-6`}
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
    <div className="flex items-end justify-between gap-4 pb-1">
      <div className="min-w-0">
        <p className="text-[12px] text-muted-foreground">
          {kicker}
        </p>
        <h1 className="mt-1 font-heading text-[28px] leading-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
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
    <div className={`overflow-hidden rounded-xl border border-border bg-panel ${className}`}>{children}</div>
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
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <span className="text-[14px] font-medium text-foreground">
        {label}
      </span>
      {meta ? (
        <span className="text-[13px] text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}
