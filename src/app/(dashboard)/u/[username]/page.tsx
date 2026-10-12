import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageFrame, Panel, PanelHeader } from "@/components/layout/PageFrame";
import { DeskAvatar } from "@/components/laniakea/DeskAvatar";
import { FollowAuthorButton } from "@/components/laniakea/FollowAuthorButton";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { requireUser } from "@/lib/auth/session";
import { researchCommentPath, researchExcerpt, researchPostPath } from "@/lib/research/feed";
import {
  countAuthorFollowers,
  isAuthorFollowed,
} from "@/lib/research/forum";

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
  const withAvatar = await supabase
    .from("profiles")
    .select("id, username, display_name, tier, bio, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle();
  const withBio =
    withAvatar.error && withAvatar.error.message.includes("avatar_url")
      ? await supabase
          .from("profiles")
          .select("id, username, display_name, tier, bio, created_at")
          .eq("username", username)
          .maybeSingle()
      : withAvatar;
  const profileRead =
    withBio.error && withBio.error.message.includes("bio")
      ? await supabase
          .from("profiles")
          .select("id, username, display_name, tier, created_at")
          .eq("username", username)
          .maybeSingle()
      : withBio;
  const row = profileRead.data;

  if (!row) {
    notFound();
  }

  const profile = {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    tier: row.tier,
    created_at: row.created_at,
    bio: "bio" in row && typeof row.bio === "string" ? row.bio : null,
    avatar_url:
      "avatar_url" in row && typeof row.avatar_url === "string"
        ? row.avatar_url
        : null,
  };

  if (profile.username === "laniakea_treasury") {
    notFound();
  }

  const [{ data: posts }, { data: comments }, following, followerCount, noteTotal, commentTotal] =
    await Promise.all([
    supabase
      .from("research_posts")
      .select("id, title, body, ai_summary, sub_topic, created_at, status")
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
    supabase
      .from("research_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id),
    supabase
      .from("research_comments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id),
  ]);

  const noteCount = noteTotal.count ?? posts?.length ?? 0;
  const commentCount = commentTotal.count ?? comments?.length ?? 0;

  return (
    <PageFrame>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <DeskAvatar url={profile.avatar_url} name={profile.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-muted-foreground">User</p>
          <h1 className="mt-1 font-heading text-[28px] leading-tight text-foreground">
            {profile.display_name}
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            @{profile.username} · joined {format(new Date(profile.created_at), "d MMM yyyy")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TierBadge tier={profile.tier} size="md" />
            <span className="text-[13px] text-muted-foreground">
              {followerCount} {followerCount === 1 ? "follower" : "followers"}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {noteCount} {noteCount === 1 ? "note" : "notes"}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
          </div>
          {profile.id !== userId ? (
            <div className="mt-4">
              <FollowAuthorButton
                authorId={profile.id}
                following={following}
                followerCount={followerCount}
                showCount={false}
              />
            </div>
          ) : null}
        </div>
      </div>

      {profile.bio ? (
        <p className="max-w-2xl text-[16px] leading-relaxed text-foreground">{profile.bio}</p>
      ) : null}

      <Panel>
        <PanelHeader label="Notes" meta={noteCount} />
        {noteCount === 0 ? (
          <p className="px-4 py-5 text-[14px] text-muted-foreground">No published notes yet.</p>
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
                {post.ai_summary || post.body ? (
                  <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                    {post.ai_summary?.trim() || researchExcerpt(post.body, 180)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader label="Comments" meta={commentCount} />
        {commentCount === 0 ? (
          <p className="px-4 py-5 text-[14px] text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {(comments ?? []).map((comment) => (
              <article key={comment.id} className="px-4 py-4">
                <Link
                  href={researchCommentPath(comment.post_id, comment.id)}
                  className="text-[12px] text-muted-foreground hover:text-foreground"
                >
                  On a note · {format(new Date(comment.created_at), "d MMM yyyy")}
                </Link>
                <p className="mt-1 line-clamp-3 text-[15px] leading-relaxed text-foreground">
                  {researchExcerpt(comment.body, 220)}
                </p>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </PageFrame>
  );
}
