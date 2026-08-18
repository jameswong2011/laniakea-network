import Link from "next/link";
import { feedTopicHref, feedTopicsHref } from "@/lib/research/feed";
import { SUB_TOPICS, type SubTopic } from "@/types";

function chipClassName(active: boolean) {
  return `rounded-full px-3 py-1 text-[12px] ${
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
    <nav className="flex flex-wrap items-center gap-1.5">
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
          className="ml-auto text-[12px] text-muted-foreground hover:text-foreground"
        >
          Reset
        </Link>
      )}
    </nav>
  );
}
