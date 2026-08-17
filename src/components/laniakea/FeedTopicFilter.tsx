import Link from "next/link";
import { feedTopicHref, feedTopicsHref } from "@/lib/research/feed";
import { SUB_TOPICS, type SubTopic } from "@/types";

function chipClassName(active: boolean) {
  return `flex h-7 items-center px-2.5 font-data text-[10px] tracking-[0.12em] uppercase ${
    active
      ? "bg-panel-elevated text-foreground shadow-[inset_0_-2px_0_0_var(--gain)]"
      : "text-muted-foreground hover:bg-panel-elevated hover:text-foreground"
  }`;
}

export function FeedTopicFilter({
  selected,
}: {
  selected: SubTopic[] | null;
}) {
  const allSelected = selected == null;
  const active = selected ?? [...SUB_TOPICS];

  return (
    <nav className="flex flex-wrap items-stretch border border-border bg-panel">
      <Link href="/feed" className={chipClassName(allSelected)}>
        All
      </Link>
      {SUB_TOPICS.map((topic) => (
        <Link
          key={topic}
          href={feedTopicHref(selected, topic)}
          className={chipClassName(active.includes(topic))}
        >
          {topic}
        </Link>
      ))}
      {allSelected ? null : (
        <Link
          href={feedTopicsHref([...SUB_TOPICS])}
          className="ml-auto flex h-7 items-center px-2.5 font-data text-[10px] tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground"
        >
          Reset
        </Link>
      )}
    </nav>
  );
}
