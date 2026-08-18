export function SearchBox({
  defaultValue = "",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <form action="/search" className={compact ? "hidden items-center lg:flex" : "w-full"}>
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search notes, comments, desks"
        className={
          compact
            ? "h-8 w-52 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus-visible:border-ring"
            : "h-10 w-full rounded-lg border border-border bg-background px-3 text-[15px] outline-none focus-visible:border-ring"
        }
      />
    </form>
  );
}
