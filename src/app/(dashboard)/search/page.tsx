import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { SearchBox } from "@/components/laniakea/SearchBox";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { requireUser } from "@/lib/auth/session";
import {
  researchCommentPath,
  researchExcerpt,
  researchPostPath,
} from "@/lib/research/feed";
import { profilePath, searchPattern } from "@/lib/research/forum";

export const metadata: Metadata = {
  title: "Search",
};

function firstParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";
}

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const query = firstParam((await searchParams).q).trim();
  const { supabase } = await requireUser();
  const pattern = query.length >= 2 ? searchPattern(query) : "";

  const [titleHits, bodyHits, comments, nameHits, userHits] = pattern
    ? await Promise.all([
        supabase
          .from("research_posts")
          .select("id, title, body, sub_topic, created_at")
          .ilike("title", pattern)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("research_posts")
          .select("id, title, body, sub_topic, created_at")
          .ilike("body", pattern)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("research_comments")
          .select("id, post_id, body, created_at")
          .ilike("body", pattern)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("profiles")
          .select("id, username, display_name, tier, bio")
          .ilike("display_name", pattern)
          .neq("username", "laniakea_treasury")
          .limit(12),
        supabase
          .from("profiles")
          .select("id, username, display_name, tier, bio")
          .ilike("username", pattern)
          .neq("username", "laniakea_treasury")
          .limit(12),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  const posts = {
    data: [
      ...new Map(
        [...(titleHits.data ?? []), ...(bodyHits.data ?? [])].map((row) => [
          row.id,
          row,
        ])
      ).values(),
    ],
  };
  const desks = {
    data: [
      ...new Map(
        [...(nameHits.data ?? []), ...(userHits.data ?? [])].map((row) => [
          row.id,
          row,
        ])
      ).values(),
    ],
  };

  return (
    <PageFrame>
      <PageHeading
        kicker="Find"
        title="Search"
        description="Notes, comments, and desks."
      />
      <SearchBox defaultValue={query} />
      {query.length > 0 && query.length < 2 ? (
        <p className="text-[14px] text-muted-foreground">
          Type at least two characters.
        </p>
      ) : null}
      {query.length >= 2 ? (
        <>
          <Panel>
            <PanelHeader label="Notes" meta={posts.data?.length ?? 0} />
            {(posts.data ?? []).length === 0 ? (
              <p className="px-4 py-5 text-[14px] text-muted-foreground">
                No notes matched.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {(posts.data ?? []).map((post) => (
                  <article key={post.id} className="px-4 py-4">
                    <div className="mb-1 flex items-center gap-2">
                      <SubTopicBadge topic={post.sub_topic} />
                      <span className="text-[12px] text-muted-foreground">
                        {format(new Date(post.created_at), "d MMM yyyy")}
                      </span>
                    </div>
                    <h2 className="font-heading text-[20px]">
                      <Link
                        href={researchPostPath(post.id)}
                        className="hover:underline"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-[14px] text-muted-foreground">
                      {researchExcerpt(post.body, 180)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </Panel>
          <Panel>
            <PanelHeader label="Comments" meta={comments.data?.length ?? 0} />
            {(comments.data ?? []).length === 0 ? (
              <p className="px-4 py-5 text-[14px] text-muted-foreground">
                No comments matched.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {(comments.data ?? []).map((comment) => (
                  <article key={comment.id} className="px-4 py-4">
                    <Link
                      href={researchCommentPath(comment.post_id, comment.id)}
                      className="text-[13px] text-muted-foreground hover:text-foreground"
                    >
                      Open comment ·{" "}
                      {format(new Date(comment.created_at), "d MMM yyyy")}
                    </Link>
                    <p className="mt-1 text-[14px] text-foreground">
                      {researchExcerpt(comment.body, 200)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </Panel>
          <Panel>
            <PanelHeader label="Desks" meta={desks.data?.length ?? 0} />
            {(desks.data ?? []).length === 0 ? (
              <p className="px-4 py-5 text-[14px] text-muted-foreground">
                No desks matched.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {(desks.data ?? []).map((desk) => (
                  <article key={desk.id} className="px-4 py-4">
                    <Link
                      href={profilePath(desk.username)}
                      className="font-medium hover:underline"
                    >
                      {desk.display_name}{" "}
                      <span className="font-normal text-muted-foreground">
                        @{desk.username}
                      </span>
                    </Link>
                    {desk.bio ? (
                      <p className="mt-1 text-[14px] text-muted-foreground">
                        {desk.bio}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </>
      ) : null}
    </PageFrame>
  );
}
