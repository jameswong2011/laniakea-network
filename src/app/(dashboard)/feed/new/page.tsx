import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageHeading } from "@/components/layout/PageFrame";
import { NewResearchForm } from "@/components/laniakea/NewResearchForm";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { resolveTier } from "@/types";

export const metadata: Metadata = {
  title: "New Research Post",
};

export default async function NewResearchPage() {
  const { profile } = await requireUser();
  const deskTier = resolveTier(profile?.tier) ?? "Bronze";
  const availableHp = profile?.current_hp ?? 0;

  return (
    <PageFrame>
      <PageHeading
        kicker="Compose"
        title="New Research Post"
        description="Stake HP to publish a note. Health 0 hunts it; 5× stake ascends."
        meta={
          <>
            <TierBadge tier={deskTier} size="md" />
            <Link
              href="/feed"
              className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground"
            >
              Back to feed
            </Link>
          </>
        }
      />
      <NewResearchForm availableHp={availableHp} deskTier={deskTier} />
    </PageFrame>
  );
}
