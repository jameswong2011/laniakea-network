import Link from "next/link";
import { SUB_TOPICS, VAULT_SUB_TOPICS, isVaultSubTopic, type SubTopic } from "@/types";

function tabClassName(active: boolean) {
  return `flex h-7 items-center px-2.5 font-data text-[10px] tracking-[0.12em] uppercase ${
    active
      ? "bg-panel-elevated text-foreground shadow-[inset_0_-2px_0_0_var(--gain)]"
      : "text-muted-foreground hover:bg-panel-elevated hover:text-foreground"
  }`;
}

export function RankingTopicNav({
  selected,
}: {
  selected: SubTopic | null;
}) {
  return (
    <nav className="flex flex-wrap items-stretch border border-border bg-panel">
      <Link href="/ranking" className={tabClassName(selected === null)}>
        Overall
      </Link>
      {VAULT_SUB_TOPICS.map((topic) => (
        <Link
          key={topic}
          href={`/ranking?topic=${encodeURIComponent(topic)}`}
          className={tabClassName(selected === topic)}
        >
          {topic}
        </Link>
      ))}
      {SUB_TOPICS.filter((topic) => !isVaultSubTopic(topic)).map((topic) => (
        <Link
          key={topic}
          href={`/ranking?topic=${encodeURIComponent(topic)}`}
          className={tabClassName(selected === topic)}
        >
          {topic}
        </Link>
      ))}
    </nav>
  );
}
