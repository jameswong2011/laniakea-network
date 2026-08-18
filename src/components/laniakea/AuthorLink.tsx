import Link from "next/link";
import { DeskAvatar } from "@/components/laniakea/DeskAvatar";
import { profilePath } from "@/lib/research/forum";

export function AuthorLink({
  username,
  displayName,
  avatarUrl,
}: {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const name = displayName ?? "Unknown";
  const handle = username ?? null;

  if (!handle) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <DeskAvatar url={avatarUrl} name={name} size="xs" />
        {name}
      </span>
    );
  }

  return (
    <Link
      href={profilePath(handle)}
      className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
    >
      <DeskAvatar url={avatarUrl} name={name} size="xs" />
      {name}
      <span className="font-normal text-muted-foreground">@{handle}</span>
    </Link>
  );
}
