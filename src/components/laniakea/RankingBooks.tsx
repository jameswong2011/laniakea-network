import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { formatHp } from "@/lib/format";
import type { TopicStanding } from "@/lib/research/subtopic-ranks";

export function RankingBooks({ books }: { books: TopicStanding[] }) {
  if (books.length === 0) {
    return (
      <span className="font-data text-[11px] text-muted-foreground">—</span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {books.map((book) => (
        <div key={book.subTopic} className="flex items-center gap-1.5">
          <SubTopicBadge topic={book.subTopic} />
          <TierBadge tier={book.tier} />
          <span className="font-data text-[11px] text-gain">
            {formatHp(book.currentHp)}
          </span>
          <span className="font-data text-[10px] text-muted-foreground">
            #{String(book.rank).padStart(2, "0")}
          </span>
        </div>
      ))}
    </div>
  );
}
