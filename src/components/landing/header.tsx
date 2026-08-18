import Link from "next/link";

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
      <path
        d="M4 24c5-10 8-14 12-14s7 4 12 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="16" cy="10" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function LandingHeader({
  overHero = false,
  isSignedIn = false,
}: {
  overHero?: boolean;
  isSignedIn?: boolean;
}) {
  return (
    <header
      className={
        overHero
          ? "absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-5 py-4 md:px-8"
          : "relative z-30 flex items-center justify-between gap-4 border-b border-border bg-bg px-5 py-4 md:px-8"
      }
    >
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2.5 text-fg"
        aria-label="Laniakea home"
      >
        <Mark />
        <span className="font-mono text-xs tracking-mark uppercase">
          Laniakea
        </span>
      </Link>

      <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
        <a
          href="#thesis"
          className="inline-flex min-h-11 items-center transition-colors hover:text-fg"
        >
          Thesis
        </a>
        <a
          href="#floor"
          className="inline-flex min-h-11 items-center transition-colors hover:text-fg"
        >
          Floor
        </a>
        <a
          href="#arena"
          className="inline-flex min-h-11 items-center transition-colors hover:text-fg"
        >
          Arena
        </a>
        <a
          href="#chain"
          className="inline-flex min-h-11 items-center transition-colors hover:text-fg"
        >
          Chain
        </a>
      </nav>

      {isSignedIn ? (
        <Link
          href="/feed"
          className="tap-scale inline-flex h-11 items-center rounded-xs bg-accent px-3.5 text-xs font-medium text-accent-fg hover:bg-fg"
        >
          Enter the floor
        </Link>
      ) : (
        <Link
          href="/login"
          className="tap-scale inline-flex h-11 items-center rounded-xs bg-accent px-3.5 text-xs font-medium text-accent-fg hover:bg-fg"
        >
          Request access
        </Link>
      )}
    </header>
  );
}
