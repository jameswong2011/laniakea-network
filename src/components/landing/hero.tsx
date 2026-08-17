import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative isolate overflow-x-clip bg-bg md:min-h-dvh">
      <div className="absolute inset-0">
        <Image
          src="/heroes/supercluster.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="hero-wash absolute inset-0" />
        <div className="hero-grain absolute inset-0" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col justify-end px-5 pt-24 pb-8 md:min-h-dvh md:px-8 md:pt-32 md:pb-10">
        <p className="section-kicker mb-5">
          WSB energy · Substack quality · Ranked arena
        </p>
        <h1 className="max-w-4xl font-display text-3xl leading-display text-fg">
          The ranked arena for{" "}
          <em className="italic">investment research.</em>
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted md:text-lg">
          Quality has a cost. Conviction has a score. The crowd settles the
          thesis. Laniakea is the research floor where publishing and voting
          spend HP — scarce inventory, not a leaderboard.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="tap-scale inline-flex h-12 items-center gap-2 rounded-sm bg-accent px-6 text-sm font-medium text-accent-fg hover:bg-fg"
          >
            Request access
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#mechanisms"
            className="tap-scale inline-flex h-12 items-center gap-2 rounded-sm px-6 text-sm font-medium text-fg shadow-border hover:shadow-border-hover"
          >
            Read the mechanisms
            <ArrowDown className="size-4" />
          </a>
        </div>
        <p className="mt-10 font-mono text-xs tracking-kicker text-subtle uppercase">
          Supercluster — the filament
        </p>
      </div>
    </section>
  );
}
