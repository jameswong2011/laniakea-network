import type { Metadata } from "next";
import { Floor } from "@/components/landing/floor";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HuntAscent } from "@/components/landing/hunt-ascent";
import { Close } from "@/components/landing/mechanisms";
import { Mission } from "@/components/landing/mission";
import { Seats } from "@/components/landing/seats";
import { getAuthContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Two seats. One research floor.",
  description:
    "Laniakea is a scarce-speech floor for investment research. Creators stake Health Points to publish and judge. Individual investors read the tape and unlock higher rooms.",
};

export default async function LandingPage() {
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { userId } = hasSupabase
    ? await getAuthContext()
    : { userId: null };

  return (
    <div className="landing min-h-dvh overflow-x-clip bg-bg text-fg">
      <LandingHeader overHero isSignedIn={Boolean(userId)} />
      <main>
        <Hero />
        <Mission />
        <Seats />
        <Floor />
        <HuntAscent />
        <Close />
      </main>
      <LandingFooter />
    </div>
  );
}
