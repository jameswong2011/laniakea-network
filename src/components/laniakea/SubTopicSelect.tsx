import { SUB_TOPICS, VAULT_SUB_TOPICS, isVaultSubTopic } from "@/types";

const fieldClassName =
  "h-8 w-full border border-border bg-panel-elevated px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring";

export function SubTopicSelect({
  name = "subTopic",
  defaultValue,
  required = true,
  onChange,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue ?? ""}
      onChange={(event) => onChange?.(event.target.value)}
      className={fieldClassName}
    >
      <option value="" disabled>
        Select sub-topic
      </option>
      <optgroup label="Vault books">
        {VAULT_SUB_TOPICS.map((topic) => (
          <option key={topic} value={topic}>
            {topic}
          </option>
        ))}
      </optgroup>
      <optgroup label="Broad books">
        {SUB_TOPICS.filter((topic) => !isVaultSubTopic(topic)).map((topic) => (
          <option key={topic} value={topic}>
            {topic}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
