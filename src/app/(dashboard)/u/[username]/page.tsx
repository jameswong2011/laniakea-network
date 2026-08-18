import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageFrame, PageHeading, Panel, PanelHeader } from "@/components/layout/PageFrame";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { researchPostPath } from "@/lib/research/feed";
import { MarkdownBody } from "@/components/laniakea/MarkdownBody";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  const { supabase } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, tier, created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile || profile.username === "laniakea_treasury") {
    notFound();
  }

  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase
      .from("research_posts")
      .select("id, title, body, sub_topic, created_at, status")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("research_comments")
      .select("id, post_id, body, created_at")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return (
    <PageFrame>
      <PageHeading
        kicker="Desk"
        title={profile.display_name}
        description={`@${profile.username} · joined ${format(new Date(profile.created_at), "d MMM yyyy")}`}
        meta={<TierBadge tier={profile.tier} size="md" />}
      />

      <Panel>
        <PanelHeader label="Posts" meta={posts?.length ?? 0} />
        {(posts ?? []).length === 0 ? (
          <p className="px-4 py-5 text-[14px] text-muted-foreground">
            No published notes yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {(posts ?? []).map((post) => (
              <article key={post.id} className="px-4 py-4">
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
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader label="Recent comments" meta={comments?.length ?? 0} />
        {(comments ?? []).length === 0 ? (
          <p className="px-4 py-5 text-[14px] text-muted-foreground">
            No comments yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {(comments ?? []).map((comment) => (
              <article key={comment.id} className="px-4 py-4">
                <p className="mb-2 text-[12px] text-muted-foreground">
                  <Link
                    href={researchPostPath(comment.post_id)}
                    className="hover:text-foreground"
                  >
                    On a note · {format(new Date(comment.created_at), "d MMM yyyy")}
                  </Link>
                </p>
                <MarkdownBody source={comment.body} />
              </article>
            ))}
          </div>
        )}
      </Panel>
    </PageFrame>
  );
}
