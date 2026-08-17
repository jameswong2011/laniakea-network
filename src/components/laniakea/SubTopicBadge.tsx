import { SUB_TOPIC_CODES, resolveSubTopic } from "@/types";

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
  const code = resolved ? SUB_TOPIC_CODES[resolved] : "TOPIC";

  return (
    <span
      className={`inline-flex shrink-0 items-stretch overflow-hidden border border-border bg-panel-elevated text-foreground ${
        compact ? "h-6" : "h-7"
      }`}
    >
      <span
        className={`flex items-center bg-muted font-data font-semibold tracking-[0.08em] text-muted-foreground ${
          compact ? "px-1.5 text-[10px]" : "px-2 text-[11px]"
        }`}
      >
        {code}
      </span>
      <span
        className={`flex items-center border-l border-border font-data font-medium tracking-[0.12em] uppercase ${
          compact ? "px-1.5 text-[10px]" : "px-2 text-[11px]"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
