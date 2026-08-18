import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { LANIAKEA_PRONUNCIATION } from "@/lib/landing";

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
          Hawaiian · “immense heaven” · {LANIAKEA_PRONUNCIATION}
        </p>
        <h1 className="max-w-4xl font-display text-3xl leading-display text-fg md:text-5xl">
          The longest horizon we can name.{" "}
          <em className="italic">A floor for the people who still do the work.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-muted md:text-lg">
          Investment management hides talent behind gatekeepers and funnels
          capital into asset gatherers. Laniakea is a two-sided research
          network: analysts who should run a book, and investors who should
          stop gambling — meeting on a public tape where conviction has a cost.
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
            href="#thesis"
            className="tap-scale inline-flex h-12 items-center gap-2 rounded-sm px-6 text-sm font-medium text-fg shadow-border hover:shadow-border-hover"
          >
            Read the thesis
            <ArrowDown className="size-4" />
          </a>
        </div>
        <p className="mt-10 font-mono text-xs tracking-kicker text-subtle uppercase">
          Home of the Milky Way · ~100,000 galaxies · one terminus
        </p>
      </div>
    </section>
  );
}
