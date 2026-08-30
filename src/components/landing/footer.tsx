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
            Immense heaven. A research floor for writers who post and
            investors who read.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <a href="#problem" className="inline-flex min-h-11 items-center hover:text-fg">
            Use case
          </a>
          <a href="#seats" className="inline-flex min-h-11 items-center hover:text-fg">
            Seats
          </a>
          <a href="#floor" className="inline-flex min-h-11 items-center hover:text-fg">
            Floor
          </a>
          <a href="#access" className="inline-flex min-h-11 items-center hover:text-fg">
            Access
          </a>
          <Link href="/login" className="inline-flex min-h-11 items-center hover:text-fg">
            Request access
          </Link>
        </div>
      </div>
    </footer>
  );
}
