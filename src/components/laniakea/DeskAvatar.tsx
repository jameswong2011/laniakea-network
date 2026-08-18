const SIZE = {
  xs: "size-5 text-[9px]",
  sm: "size-8 text-[11px]",
  md: "size-10 text-[13px]",
  lg: "size-16 text-[18px]",
} as const;

export function DeskAvatar({
  url,
  name,
  size = "sm",
}: {
  url?: string | null;
  name: string;
  size?: keyof typeof SIZE;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={`${SIZE[size]} shrink-0 rounded-full border border-border object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-muted font-data text-muted-foreground ${SIZE[size]}`}
    >
      {initial}
    </span>
  );
}
