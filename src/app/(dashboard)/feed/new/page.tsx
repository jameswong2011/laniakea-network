import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageHeading } from "@/components/layout/PageFrame";
import { NewResearchForm } from "@/components/laniakea/NewResearchForm";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { loadDraftById } from "@/lib/research/forum";
import { resolveTier } from "@/types";

export const metadata: Metadata = {
  title: "New Research Post",
};

export default async function NewResearchPage({
  searchParams,
}: PageProps<"/feed/new">) {
  const { profile, supabase, userId } = await requireUser();
  const draftId = (await searchParams).draft;
  const draftValue = Array.isArray(draftId) ? draftId[0] : draftId;
  const draft =
    draftValue
      ? await loadDraftById(supabase, userId, draftValue)
      : null;
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
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              Back to feed
            </Link>
          </>
        }
      />
      <NewResearchForm
        availableHp={availableHp}
        deskTier={deskTier}
        draft={draft?.kind === "post" ? draft : null}
      />
    </PageFrame>
  );
}
