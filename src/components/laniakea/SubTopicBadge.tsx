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
      className={`inline-flex shrink-0 items-center rounded-full border border-border bg-muted text-muted-foreground ${
        compact ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[12px]"
      }`}
    >
      {label}
    </span>
  );
}
