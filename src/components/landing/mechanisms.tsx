import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SIGNUP_INVITE_GRANT } from "@/lib/research/referral";

export function Close() {
  return (
    <section id="access" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <p className="section-kicker">Access</p>
        <h2 className="mt-4 max-w-3xl font-display text-3xl leading-display text-fg">
          Request a seat. Write, or read.
        </h2>
        <p className="mt-6 max-w-xl text-muted">
          The floor is invite-only. Every desk starts with{" "}
          {SIGNUP_INVITE_GRANT} codes. Creators post and judge. Investors
          unlock the rooms above them. Same tape either way.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="tap-scale inline-flex h-12 cursor-pointer items-center gap-2 rounded-sm bg-accent px-6 text-sm font-medium text-accent-fg hover:bg-fg"
          >
            Request access
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
