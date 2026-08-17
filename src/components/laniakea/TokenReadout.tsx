import { formatHp } from "@/lib/format";

export function TokenReadout({
  value,
  size = "sm",
}: {
  value: number | null;
  size?: "sm" | "md";
}) {
  const compact = size === "sm";

  return (
    <span
      className={`inline-flex shrink-0 items-stretch overflow-hidden border border-border bg-panel-elevated ${
        compact ? "h-6" : "h-7"
      }`}
    >
      <span
        className={`flex items-center bg-muted font-data font-medium tracking-[0.14em] text-muted-foreground uppercase ${
          compact ? "px-1.5 text-[10px]" : "px-2 text-[10px]"
        }`}
      >
        UTL
      </span>
      <span
        className={`flex items-center border-l border-border font-data text-foreground ${
          compact ? "px-1.5 text-[11px]" : "px-2 text-[13px]"
        }`}
      >
        {value === null ? "—" : formatHp(value)}
      </span>
    </span>
  );
}
