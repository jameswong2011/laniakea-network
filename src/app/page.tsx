import type { Metadata } from "next";
import { Floor } from "@/components/landing/floor";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HuntAscent } from "@/components/landing/hunt-ascent";
import { Close, Rulebook } from "@/components/landing/mechanisms";
import { Mission, Wave } from "@/components/landing/mission";
import { getAuthContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Open skies for investment research",
  description:
    "Laniakea connects analysts who should run a book with investors who should stop gambling — a two-sided research floor where conviction has a cost.",
};

export default async function LandingPage() {
  const { userId } = await getAuthContext();

  return (
    <div className="landing min-h-dvh overflow-x-clip bg-bg text-fg">
      <LandingHeader overHero isSignedIn={Boolean(userId)} />
      <main>
        <Hero />
        <Mission />
        <Wave />
        <Floor />
        <HuntAscent />
        <Rulebook />
        <Close />
      </main>
      <LandingFooter />
    </div>
  );
}
