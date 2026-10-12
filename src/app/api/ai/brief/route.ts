import { after } from "next/server";
import { AI_LIMIT_MESSAGE, overAiLimit } from "@/lib/ai/limits";
import {
  ensureNoteBrief,
  lockedBrief,
  noteBriefNeedsGeneration,
  storedNoteBrief,
} from "@/lib/ai/note-brief";
import { readerAccess, viewerFromRequest } from "@/lib/ai/viewer";
import { readOpenNotes } from "@/lib/research/open-notes";

export const maxDuration = 90;

const STORED_COLUMNS =
  "author_id, edited_at, ai_generated_at, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks, ai_comment_agreement, ai_comment_objection";
const STORED_COLUMNS_WITHOUT_COMMENTS =
  "author_id, edited_at, ai_generated_at, ai_summary, ai_ticker, ai_conviction, ai_claims, ai_risks";

export async function POST(request: Request) {
  const viewer = await viewerFromRequest(request);

  if (!viewer) {
    return Response.json({ error: "Sign in to brief this note." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { postId?: string; refresh?: boolean; background?: boolean }
    | null;
  const postId = body?.postId?.trim() ?? "";

  if (!postId) {
    return Response.json({ error: "Missing note." }, { status: 400 });
  }

  const withComments = await readOpenNotes((relation) =>
    viewer.supabase.from(relation).select(STORED_COLUMNS).eq("id", postId).maybeSingle()
  );
  const read =
    withComments.error?.message.includes("ai_comment")
      ? await viewer.supabase
          .from("research_posts")
          .select(STORED_COLUMNS_WITHOUT_COMMENTS)
          .eq("id", postId)
          .maybeSingle()
      : withComments;

  if (!read.data) {
    return Response.json({ brief: null });
  }

  const note = read.data as { author_id: string };
  const { access, isAdmin } = await readerAccess(viewer.supabase, viewer.userId, {
    id: postId,
    author_id: note.author_id,
  });
  const stored = storedNoteBrief(read.data);
  const refresh = body?.refresh === true;

  if (refresh && note.author_id !== viewer.userId && !isAdmin) {
    return Response.json({ error: "Only the author can refresh this summary." }, { status: 403 });
  }

  if (!refresh && !noteBriefNeedsGeneration(read.data)) {
    return Response.json({ brief: access === "hidden" ? lockedBrief(stored) : stored });
  }

  if (await overAiLimit(viewer.userId, "brief")) {
    if (stored) {
      return Response.json({ brief: access === "hidden" ? lockedBrief(stored) : stored });
    }

    return Response.json({ error: AI_LIMIT_MESSAGE }, { status: 429 });
  }

  if (refresh && body?.background) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: "The server writer is not configured." }, { status: 503 });
    }

    after(() =>
      ensureNoteBrief(postId, {
        refresh: true,
        comments: true,
        reader: viewer.supabase,
        userId: viewer.userId,
      })
    );
    return Response.json({ queued: true }, { status: 202 });
  }

  const generated = await ensureNoteBrief(postId, {
    refresh,
    comments: refresh,
    reader: viewer.supabase,
    userId: viewer.userId,
  });
  const brief = generated
    ? {
        ...generated,
        agreement: generated.agreement ?? stored?.agreement ?? null,
        objection: generated.objection ?? stored?.objection ?? null,
      }
    : stored;

  if (!brief) {
    return Response.json(
      {
        error: !process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "The server writer is not configured."
          : process.env.OPENROUTER_API_KEY
            ? "The summary is still being written. Try again in a minute."
            : "OpenRouter is not set on the server.",
      },
      { status: 503 }
    );
  }

  return Response.json({ brief });
}
