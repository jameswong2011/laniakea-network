import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { requireUser } from "@/lib/auth/session";
import { researchComposePath, researchPostPath } from "@/lib/research/feed";
import { FORUM_DISCOVERY_SQL } from "@/lib/research/forum-discovery-sql";
import { isMissingForumSchema, loadPostDrafts } from "@/lib/research/forum";
import { deleteDraft } from "@/app/(dashboard)/forum/actions";

export const metadata: Metadata = {
  title: "Drafts",
};

export default async function DraftsPage() {
  const { supabase, userId } = await requireUser();
  const probe = await supabase
    .from("content_drafts")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (probe.error && isMissingForumSchema(probe.error.message)) {
    return (
      <PageFrame>
        <PageHeading
          kicker="Write"
          title="Drafts"
          description="Unpublished notes stay here until you publish or delete them."
        />
        <Panel className="p-4">
          <p className="mb-3 text-[14px] text-warning">
            Drafts need the discovery SQL. Paste this into the Supabase SQL
            editor, then refresh.
          </p>
          <pre className="overflow-auto font-data text-[10px] leading-relaxed">
            {FORUM_DISCOVERY_SQL}
          </pre>
        </Panel>
      </PageFrame>
    );
  }

  const drafts = await loadPostDrafts(supabase, userId);
  const comments = await supabase
    .from("content_drafts")
    .select("id, post_id, body, updated_at")
    .eq("user_id", userId)
    .eq("kind", "comment")
    .order("updated_at", { ascending: false });

  return (
    <PageFrame>
      <PageHeading
        kicker="Write"
        title="Drafts"
        description="Unpublished notes and comment starts."
        meta={
          <Link
            href={researchComposePath()}
            className="rounded-md bg-secondary px-3 py-1.5 text-[13px] hover:bg-muted"
          >
            New note
          </Link>
        }
      />
      <Panel>
        <PanelHeader label="Notes" meta={drafts.length} />
        {drafts.length === 0 ? (
          <p className="px-4 py-5 text-[14px] text-muted-foreground">
            No note drafts. Writing on New post auto-saves here.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {drafts.map((draft) => (
              <article
                key={draft.id}
                className="flex items-start justify-between gap-3 px-4 py-4"
              >
                <div className="min-w-0">
                  <h2 className="font-heading text-[20px]">
                    <Link
                      href={`${researchComposePath()}?draft=${draft.id}`}
                      className="hover:underline"
                    >
                      {draft.title.trim() || "Untitled draft"}
                    </Link>
                  </h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Updated {format(new Date(draft.updated_at), "d MMM yyyy HH:mm")}
                    {draft.sub_topic ? ` · ${draft.sub_topic}` : ""}
                  </p>
                </div>
                <form action={deleteDraft}>
                  <input type="hidden" name="draftId" value={draft.id} />
                  <button
                    type="submit"
                    className="text-[13px] text-muted-foreground hover:text-loss"
                  >
                    Delete
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </Panel>
      <Panel>
        <PanelHeader label="Comments" meta={comments.data?.length ?? 0} />
        {(comments.data ?? []).length === 0 ? (
          <p className="px-4 py-5 text-[14px] text-muted-foreground">
            No comment drafts.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {(comments.data ?? []).map((draft) => (
              <article
                key={draft.id}
                className="flex items-start justify-between gap-3 px-4 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={
                      draft.post_id
                        ? researchPostPath(draft.post_id)
                        : "/feed"
                    }
                    className="hover:underline"
                  >
                    {draft.body.trim().slice(0, 120) || "Empty comment draft"}
                  </Link>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Updated{" "}
                    {format(new Date(draft.updated_at), "d MMM yyyy HH:mm")}
                  </p>
                </div>
                <form action={deleteDraft}>
                  <input type="hidden" name="draftId" value={draft.id} />
                  <button
                    type="submit"
                    className="text-[13px] text-muted-foreground hover:text-loss"
                  >
                    Delete
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </PageFrame>
  );
}
