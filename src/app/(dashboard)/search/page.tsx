import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  PageFrame,
  PageHeading,
  Panel,
  PanelHeader,
} from "@/components/layout/PageFrame";
import { AiDock } from "@/components/laniakea/AiDock";
import { SearchBox } from "@/components/laniakea/SearchBox";
import { SubTopicBadge } from "@/components/laniakea/SubTopicBadge";
import { requireUser } from "@/lib/auth/session";
import { researchCommentPath, researchPostPath } from "@/lib/research/feed";
import { profilePath } from "@/lib/research/forum";
import { rankNotesByMeaning, wantsMeaningSearch } from "@/lib/ai/meaning-search";
import {
  orderSearchPosts,
  searchExcerpt,
  searchPattern,
  searchTerms,
  textHasTerms,
} from "@/lib/research/search";

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
  const terms = query.length >= 2 ? searchTerms(query) : [];

  function matching<Q extends { ilike: (column: string, pattern: string) => Q }>(
    request: Q,
    column: string
  ) {
    return terms.reduce((current, term) => current.ilike(column, searchPattern(term)), request);
  }

  const [titleHits, bodyHits, comments, nameHits, userHits] = terms.length
    ? await Promise.all([
        matching(
          supabase.from("research_posts").select("id, title, body, sub_topic, created_at"),
          "title"
        )
          .order("created_at", { ascending: false })
          .limit(20),
        matching(
          supabase.from("research_posts").select("id, title, body, sub_topic, created_at"),
          "body"
        )
          .order("created_at", { ascending: false })
          .limit(20),
        matching(
          supabase.from("research_comments").select("id, post_id, body, created_at"),
          "body"
        )
          .order("created_at", { ascending: false })
          .limit(12),
        matching(
          supabase.from("profiles").select("id, username, display_name, tier, bio"),
          "display_name"
        )
          .neq("username", "laniakea_treasury")
          .limit(12),
        matching(
          supabase.from("profiles").select("id, username, display_name, tier, bio"),
          "username"
        )
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

  const ordered = orderSearchPosts(
    [
      ...new Map(
        [...(titleHits.data ?? []), ...(bodyHits.data ?? [])].map((row) => [
          row.id,
          {
            id: row.id,
            title: row.title,
            body: row.body,
            subTopic: row.sub_topic,
            createdAt: row.created_at,
          },
        ])
      ).values(),
    ],
    query
  );
  const commentRows = [...(comments.data ?? [])]
    .filter((row) => textHasTerms(row.body, query))
    .sort((a, b) => {
      const phrase = query.toLowerCase();
      const aPhrase = a.body.toLowerCase().includes(phrase) ? 0 : 1;
      const bPhrase = b.body.toLowerCase().includes(phrase) ? 0 : 1;
      if (aPhrase !== bPhrase) {
        return aPhrase - bPhrase;
      }
      return a.created_at < b.created_at ? 1 : -1;
    });
  const commentPostIds = [...new Set(commentRows.map((row) => row.post_id))];
  const commentPosts = commentPostIds.length
    ? await supabase.from("research_posts").select("id, title").in("id", commentPostIds)
    : { data: [] };
  const commentTitles = new Map((commentPosts.data ?? []).map((row) => [row.id, row.title]));
  const desks = [
    ...new Map(
      [...(nameHits.data ?? []), ...(userHits.data ?? [])].map((row) => [row.id, row])
    ).values(),
  ];
  const meaning = wantsMeaningSearch(query) ? await rankNotesByMeaning(query, supabase) : [];

  return (
    <PageFrame>
      <PageHeading
        kicker="Find"
        title="Search"
        description="Titles first, then matches inside the note, then a reading of the summaries."
      />
      <SearchBox defaultValue={query} />
      <AiDock meaning={query.length >= 2 ? meaning : null} />
      {query.length > 0 && query.length < 2 ? (
        <p className="text-[14px] text-muted-foreground">
          Type at least two characters.
        </p>
      ) : null}
      {query.length >= 2 ? (
        <>
          {ordered.titleHits.length === 0 &&
          ordered.bodyHits.length === 0 &&
          commentRows.length === 0 &&
          desks.length === 0 &&
          meaning.length === 0 ? (
            <p className="text-[14px] text-muted-foreground">Nothing matched.</p>
          ) : null}
          {ordered.titleHits.length > 0 ? (
            <Panel>
              <PanelHeader label="Titles" meta={ordered.titleHits.length} />
              <div className="divide-y divide-border">
                {ordered.titleHits.map((post) => (
                  <article key={post.id} className="px-4 py-4">
                    <div className="mb-1 flex items-center gap-2">
                      <SubTopicBadge topic={post.subTopic} />
                      <span className="text-[12px] text-muted-foreground">
                        {format(new Date(post.createdAt), "d MMM yyyy")}
                      </span>
                    </div>
                    <h2 className="font-heading text-[20px]">
                      <Link href={researchPostPath(post.id)} className="hover:underline">
                        {post.title}
                      </Link>
                    </h2>
                    {post.body ? (
                      <p className="mt-1 text-[14px] text-muted-foreground">
                        {searchExcerpt(post.body, query, 180, false)}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </Panel>
          ) : null}
          {ordered.bodyHits.length > 0 ? (
            <Panel>
              <PanelHeader label="In the note" meta={ordered.bodyHits.length} />
              <div className="divide-y divide-border">
                {ordered.bodyHits.map((post) => (
                  <article key={post.id} className="px-4 py-4">
                    <div className="mb-1 flex items-center gap-2">
                      <SubTopicBadge topic={post.subTopic} />
                      <span className="text-[12px] text-muted-foreground">
                        {format(new Date(post.createdAt), "d MMM yyyy")}
                      </span>
                    </div>
                    <h2 className="font-heading text-[20px]">
                      <Link href={researchPostPath(post.id)} className="hover:underline">
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-[14px] text-muted-foreground">
                      {searchExcerpt(post.body, query, 220)}
                    </p>
                  </article>
                ))}
              </div>
            </Panel>
          ) : null}
          {commentRows.length > 0 ? (
            <Panel>
              <PanelHeader label="Comments" meta={commentRows.length} />
              <div className="divide-y divide-border">
                {commentRows.map((comment) => (
                  <article key={comment.id} className="px-4 py-4">
                    <h2 className="font-heading text-[18px]">
                      <Link
                        href={researchCommentPath(comment.post_id, comment.id)}
                        className="hover:underline"
                      >
                        {commentTitles.get(comment.post_id) ?? "Note"}
                      </Link>
                    </h2>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Comment · {format(new Date(comment.created_at), "d MMM yyyy")}
                    </p>
                    <p className="mt-1 text-[14px] text-foreground">
                      {searchExcerpt(comment.body, query, 200)}
                    </p>
                  </article>
                ))}
              </div>
            </Panel>
          ) : null}
          {desks.length > 0 ? (
            <Panel>
              <PanelHeader label="Desks" meta={desks.length} />
              <div className="divide-y divide-border">
                {desks.map((desk) => (
                  <article key={desk.id} className="px-4 py-4">
                    <Link href={profilePath(desk.username)} className="font-medium hover:underline">
                      {desk.display_name}{" "}
                      <span className="font-normal text-muted-foreground">@{desk.username}</span>
                    </Link>
                    {desk.bio ? (
                      <p className="mt-1 text-[14px] text-muted-foreground">{desk.bio}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </Panel>
          ) : null}
        </>
      ) : null}
    </PageFrame>
  );
}
