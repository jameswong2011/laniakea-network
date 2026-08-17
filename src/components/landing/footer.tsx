import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="font-mono text-xs tracking-mark text-fg uppercase">
            Laniakea
          </p>
          <p className="mt-2 max-w-sm text-sm text-subtle">
            The ranked arena for investment research.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <a href="#mechanisms" className="inline-flex min-h-11 items-center hover:text-fg">
            Mechanisms
          </a>
          <a href="#arena" className="inline-flex min-h-11 items-center hover:text-fg">
            Hunt / Ascent
          </a>
          <a href="#book" className="inline-flex min-h-11 items-center hover:text-fg">
            The book
          </a>
          <Link href="/login" className="inline-flex min-h-11 items-center hover:text-fg">
            Request access
          </Link>
        </div>
      </div>
    </footer>
  );
}
