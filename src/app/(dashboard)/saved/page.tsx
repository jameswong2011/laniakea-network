import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { PageFrame, PageHeading, Panel } from "@/components/layout/PageFrame";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { requireUser } from "@/lib/auth/session";
import { researchPostPath } from "@/lib/research/feed";
import { FORUM_SOCIAL_SQL } from "@/lib/research/forum-sql";
import { isMissingForumSchema } from "@/lib/research/forum";

export const metadata: Metadata = {
  title: "Saved",
};

export default async function SavedPage() {
  const { supabase, userId } = await requireUser();
  const saved = await supabase
    .from("saved_posts")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (saved.error) {
    return (
      <PageFrame>
        <PageHeading
          kicker="Library"
          title="Saved"
          description="Bookmarks for notes you want to return to."
        />
        {isMissingForumSchema(saved.error.message) ? (
          <Panel className="p-4">
            <p className="mb-3 text-[14px] text-warning">
              Saved posts need the forum SQL. Paste this into the Supabase SQL
              editor, then refresh.
            </p>
            <pre className="overflow-auto font-data text-[10px] leading-relaxed">
              {FORUM_SOCIAL_SQL}
            </pre>
          </Panel>
        ) : (
          <p className="text-[14px] text-loss">{saved.error.message}</p>
        )}
      </PageFrame>
    );
  }

  const ids = (saved.data ?? []).map((row) => row.post_id as string);
  const posts =
    ids.length === 0
      ? []
      : (
          await supabase
            .from("research_posts")
            .select("id, title, sub_topic, created_at")
            .in("id", ids)
        ).data ?? [];
  const byId = new Map(posts.map((post) => [post.id, post]));

  return (
    <PageFrame>
      <PageHeading
        kicker="Library"
        title="Saved"
        description="Bookmarks for notes you want to return to."
      />
      <Panel>
        {ids.length === 0 ? (
          <p className="px-4 py-6 text-[14px] text-muted-foreground">
            Nothing saved yet. Use Save on a thread.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {ids.map((id) => {
              const post = byId.get(id);

              if (!post) {
                return null;
              }

              return (
                <article key={id} className="px-4 py-4">
                  <div className="mb-1 flex items-center gap-2">
                    <SubTopicBadge topic={post.sub_topic} />
                    <span className="text-[12px] text-muted-foreground">
                      {format(new Date(post.created_at), "d MMM yyyy")}
                    </span>
                  </div>
                  <h2 className="font-heading text-[20px] text-foreground">
                    <Link href={researchPostPath(post.id)} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </PageFrame>
  );
}
