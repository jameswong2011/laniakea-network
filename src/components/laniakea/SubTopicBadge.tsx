import { resolveSubTopic } from "@/types";

export function SubTopicBadge({
  topic,
  size = "sm",
}: {
  topic: string | null | undefined;
  size?: "sm" | "md";
}) {
  const resolved = resolveSubTopic(topic);
  const compact = size === "sm";
  const label = resolved ?? topic ?? "—";

  return (
    <span
      className={`inline-flex shrink-0 items-center border border-border bg-panel-elevated font-data font-medium tracking-[0.12em] text-foreground uppercase ${
        compact ? "h-6 px-1.5 text-[10px]" : "h-7 px-2 text-[11px]"
      }`}
    >
      {label}
    </span>
  );
}
