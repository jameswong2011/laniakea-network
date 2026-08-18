import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageFrame, PageHeading, Panel, PanelHeader } from "@/components/layout/PageFrame";
import { DeskAvatar } from "@/components/laniakea/DeskAvatar";
import { FollowAuthorButton } from "@/components/laniakea/FollowAuthorButton";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { researchCommentPath, researchPostPath } from "@/lib/research/feed";
import {
  countAuthorFollowers,
  isAuthorFollowed,
} from "@/lib/research/forum";
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
  const { supabase, userId } = await requireUser();
  const withBio = await supabase
    .from("profiles")
    .select("id, username, display_name, tier, bio, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle();
  const profileRead = withBio.error
    ? await supabase
        .from("profiles")
        .select(
          withBio.error.message.includes("avatar_url")
            ? "id, username, display_name, tier, bio, created_at"
            : "id, username, display_name, tier, created_at"
        )
        .eq("username", username)
        .maybeSingle()
    : withBio;
  const profile = profileRead.data
    ? {
        bio: null as string | null,
        avatar_url: null as string | null,
        ...profileRead.data,
      }
    : null;

  if (!profile || profile.username === "laniakea_treasury") {
    notFound();
  }

  const [{ data: posts }, { data: comments }, following, followerCount] =
    await Promise.all([
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
    profile.id === userId
      ? Promise.resolve(false)
      : isAuthorFollowed(supabase, userId, profile.id),
    countAuthorFollowers(supabase, profile.id),
  ]);

  return (
    <PageFrame>
      <div className="flex items-end gap-4">
        <DeskAvatar
          url={profile.avatar_url}
          name={profile.display_name}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <PageHeading
            kicker="Desk"
            title={profile.display_name}
            description={`@${profile.username} · joined ${format(new Date(profile.created_at), "d MMM yyyy")}`}
            meta={
              <div className="flex items-center gap-3">
                <TierBadge tier={profile.tier} size="md" />
                {profile.id !== userId ? (
                  <FollowAuthorButton
                    authorId={profile.id}
                    following={following}
                    followerCount={followerCount}
                  />
                ) : (
                  <span className="text-[13px] text-muted-foreground">
                    {followerCount} {followerCount === 1 ? "follower" : "followers"}
                  </span>
                )}
              </div>
            }
          />
        </div>
      </div>

      {profile.bio ? (
        <p className="max-w-2xl text-[16px] leading-relaxed text-foreground">
          {profile.bio}
        </p>
      ) : null}

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
                    href={researchCommentPath(comment.post_id, comment.id)}
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
