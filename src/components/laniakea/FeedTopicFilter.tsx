import Link from "next/link";
import { feedTopicHref, feedTopicsHref } from "@/lib/research/feed";
import {
  SUB_TOPICS,
  VAULT_SUB_TOPICS,
  isVaultSubTopic,
  type SubTopic,
} from "@/types";

function chipClassName(active: boolean) {
  return `flex h-7 items-center truncate px-2 text-left text-[12px] ${
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
  }`;
}

function TopicGrid({
  topics,
  selected,
  active,
}: {
  topics: readonly SubTopic[];
  selected: SubTopic[] | null;
  active: SubTopic[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
      {topics.map((topic) => (
        <Link
          key={topic}
          href={feedTopicHref(selected, topic)}
          className={chipClassName(active.includes(topic))}
        >
          {topic}
        </Link>
      ))}
    </div>
  );
}

export function FeedTopicFilter({
  selected,
}: {
  selected: SubTopic[] | null;
}) {
  const allSelected = selected == null;
  const active = selected ?? [...SUB_TOPICS];
  const broad = SUB_TOPICS.filter((topic) => !isVaultSubTopic(topic));

  return (
    <nav className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/feed" className={chipClassName(allSelected)}>
          All
        </Link>
        {allSelected ? null : (
          <Link
            href={feedTopicsHref([...SUB_TOPICS])}
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            Reset
          </Link>
        )}
      </div>
      <TopicGrid
        topics={VAULT_SUB_TOPICS}
        selected={selected}
        active={active}
      />
      <TopicGrid topics={broad} selected={selected} active={active} />
    </nav>
  );
}
