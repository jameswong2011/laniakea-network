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
          Two seats. One research floor.{" "}
          <em className="italic">Write, or read.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-muted md:text-lg">
          Laniakea is a scarce-speech floor for investment research. Creators
          stake Health Points to publish and to judge. Individual investors
          follow desks and unlock higher rooms — without having to originate.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="tap-scale inline-flex h-12 cursor-pointer items-center gap-2 rounded-sm bg-accent px-6 text-sm font-medium text-accent-fg hover:bg-fg"
          >
            Request access
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#seats"
            className="tap-scale inline-flex h-12 cursor-pointer items-center gap-2 rounded-sm px-6 text-sm font-medium text-fg shadow-border hover:shadow-border-hover"
          >
            See both seats
            <ArrowDown className="size-4" />
          </a>
        </div>
        <p className="mt-10 font-mono text-xs tracking-kicker text-subtle uppercase">
          Creators post and engage · Investors mainly read
        </p>
      </div>
    </section>
  );
}
