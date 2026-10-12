import Link from "next/link";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/content", "Content"],
  ["/admin/users", "Users"],
  ["/admin/invites", "Invites"],
  ["/admin/ops", "Ops"],
] as const;

export function AdminNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {LINKS.map(([href, label]) => {
        const on = current === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full border px-3 py-1 text-[13px] ${
              on
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
