import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageFrame, PageHeading, Panel } from "@/components/layout/PageFrame";
import { getAuthContext } from "@/lib/auth/session";

export default async function Home() {
  const { userId } = await getAuthContext();

  if (userId) {
    redirect("/feed");
  }

  return (
    <AppShell>
      <PageFrame width="narrow">
        <PageHeading
          kicker="Ranked Investment Research"
          title="Laniakea Network"
          description="Publish research, vote on signal, and move through Bronze, Silver, Gold, Platinum, and Masters as Health Points rise or fall."
        />
        <Panel className="px-2.5 py-3">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            A professional research terminal. Sign in to open the feed, ranking
            book, and account desk.
          </p>
        </Panel>
      </PageFrame>
    </AppShell>
  );
}
