import { SUB_TOPICS } from "@/types";

const fieldClassName =
  "h-8 w-full border border-border bg-panel-elevated px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring";

export function SubTopicSelect({
  name = "subTopic",
  defaultValue,
  required = true,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue ?? ""}
      className={fieldClassName}
    >
      <option value="" disabled>
        Select sub-topic
      </option>
      {SUB_TOPICS.map((topic) => (
        <option key={topic} value={topic}>
          {topic}
        </option>
      ))}
    </select>
  );
}
