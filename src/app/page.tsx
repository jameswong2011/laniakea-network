import type { Metadata } from "next";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HuntAscent } from "@/components/landing/hunt-ascent";
import {
  Close,
  HpEconomy,
  Layers,
  NorthStar,
} from "@/components/landing/mechanisms";
import { getAuthContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "The ranked arena for investment research",
  description:
    "Quality has a cost. Conviction has a score. The crowd settles the thesis.",
};

export default async function LandingPage() {
  const { userId } = await getAuthContext();

  return (
    <div className="landing min-h-dvh overflow-x-clip bg-bg text-fg">
      <LandingHeader overHero isSignedIn={Boolean(userId)} />
      <main>
        <Hero />
        <Layers />
        <HpEconomy />
        <HuntAscent />
        <NorthStar />
        <Close />
      </main>
      <LandingFooter />
    </div>
  );
}
