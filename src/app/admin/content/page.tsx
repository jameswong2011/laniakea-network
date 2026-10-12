import type { Metadata } from "next";
import { CommentEditor, PostEditor } from "@/components/laniakea/AdminContentDesk";
import { AdminNav } from "@/components/laniakea/AdminNav";
import { SeedResearchForm } from "@/components/laniakea/SeedResearchForm";
import { PageFrame, PageHeading, Panel, PanelHeader } from "@/components/layout/PageFrame";
import { requireAdmin } from "@/lib/auth/session";
import { TREASURY_PROFILE_ID } from "@/lib/research/referral";

export const metadata: Metadata = { title: "Admin content" };

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const { supabase } = await requireAdmin();
  const [profiles, posts, comments] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name")
      .neq("id", TREASURY_PROFILE_ID)
      .order("username"),
    supabase
      .from("research_posts")
      .select("id, title, body, status, author_id, created_at")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("research_comments")
      .select("id, body, author_id, post_id, created_at")
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const names = new Map(
    (profiles.data ?? []).map((row) => [row.id as string, `@${row.username as string}`])
  );
  const titles = new Map(
    (posts.data ?? []).map((row) => [row.id as string, row.title as string])
  );
  const noteRows = (posts.data ?? []).filter((row) => {
    if (!query) {
      return true;
    }
    return `${row.title} ${row.body}`.toLowerCase().includes(query);
  });
  const commentRows = (comments.data ?? []).filter((row) => {
    if (!query) {
      return true;
    }
    return String(row.body).toLowerCase().includes(query);
  });

  return (
    <PageFrame width="wide">
      <PageHeading
        kicker="Superuser"
        title="Content"
        description="Seed a note, then edit or delete notes and comments already on the tape."
      />
      <AdminNav current="/admin/content" />
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Filter loaded notes and comments"
          className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-[14px]"
        />
        <button type="submit" className="h-10 rounded-md bg-secondary px-3 text-[13px]">
          Filter
        </button>
      </form>
      <Panel>
        <PanelHeader label="Seed a note" />
        <SeedResearchForm authors={(profiles.data ?? []) as { id: string; username: string; display_name: string }[]} />
      </Panel>
      <Panel>
        <PanelHeader label="Notes" meta={noteRows.length} />
        {posts.error ? <p className="px-3 py-3 text-[13px] text-loss">{posts.error.message}</p> : null}
        {noteRows.map((row) => (
          <PostEditor
            key={row.id as string}
            id={row.id as string}
            title={row.title as string}
            body={(row.body as string) ?? ""}
            status={(row.status as string) ?? "live"}
            author={names.get(row.author_id as string) ?? "unknown"}
          />
        ))}
      </Panel>
      <Panel>
        <PanelHeader label="Comments" meta={commentRows.length} />
        {comments.error ? <p className="px-3 py-3 text-[13px] text-loss">{comments.error.message}</p> : null}
        {commentRows.map((row) => (
          <CommentEditor
            key={row.id as string}
            id={row.id as string}
            body={(row.body as string) ?? ""}
            author={names.get(row.author_id as string) ?? "unknown"}
            note={titles.get(row.post_id as string) ?? "note"}
          />
        ))}
      </Panel>
    </PageFrame>
  );
}
