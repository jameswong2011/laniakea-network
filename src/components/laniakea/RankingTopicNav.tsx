import Link from "next/link";
import { SUB_TOPICS, VAULT_SUB_TOPICS, isVaultSubTopic, type SubTopic } from "@/types";

function tabClassName(active: boolean) {
  return `flex h-7 items-center truncate px-2.5 text-left font-data text-[10px] tracking-[0.12em] uppercase ${
    active
      ? "bg-panel-elevated text-foreground shadow-[inset_0_-2px_0_0_var(--gain)]"
      : "text-muted-foreground hover:bg-panel-elevated hover:text-foreground"
  }`;
}

function TopicGrid({
  topics,
  selected,
}: {
  topics: readonly SubTopic[];
  selected: SubTopic | null;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
      {topics.map((topic) => (
        <Link
          key={topic}
          href={`/ranking?topic=${encodeURIComponent(topic)}`}
          className={tabClassName(selected === topic)}
        >
          {topic}
        </Link>
      ))}
    </div>
  );
}

export function RankingTopicNav({
  selected,
}: {
  selected: SubTopic | null;
}) {
  const broad = SUB_TOPICS.filter((topic) => !isVaultSubTopic(topic));

  return (
    <nav className="flex flex-col gap-px border border-border bg-panel">
      <Link href="/ranking" className={tabClassName(selected === null)}>
        Overall
      </Link>
      <TopicGrid topics={VAULT_SUB_TOPICS} selected={selected} />
      <TopicGrid topics={broad} selected={selected} />
    </nav>
  );
}
