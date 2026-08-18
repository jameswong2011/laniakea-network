import Link from "next/link";
import { profilePath } from "@/lib/research/forum";

export function AuthorLink({
  username,
  displayName,
}: {
  username?: string | null;
  displayName?: string | null;
}) {
  const name = displayName ?? "Unknown";
  const handle = username ?? null;

  if (!handle) {
    return <span className="font-medium text-foreground">{name}</span>;
  }

  return (
    <Link
      href={profilePath(handle)}
      className="font-medium text-foreground hover:underline"
    >
      {name}
      <span className="ml-1 font-normal text-muted-foreground">@{handle}</span>
    </Link>
  );
}
