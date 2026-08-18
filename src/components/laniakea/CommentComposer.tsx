"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createComment,
  type ThreadActionState,
} from "@/app/(dashboard)/feed/[postId]/actions";
import { saveDraft } from "@/app/(dashboard)/forum/actions";
import { ImageAttachButton } from "@/components/laniakea/ImageAttachButton";
import {
  DEFAULT_COMMENT_STAKE_HP,
  MAX_STAKE_HP,
} from "@/lib/research/economy";
import type { ContentDraft } from "@/lib/research/forum";
import { COMMENT_BODY_MAX } from "@/types";

const initialState: ThreadActionState = {};

export function CommentComposer({
  postId,
  availableHp,
  canStake,
  closedReason,
  draft = null,
}: {
  postId: string;
  availableHp: number;
  canStake: boolean;
  closedReason?: string;
  draft?: ContentDraft | null;
}) {
  const [state, action, pending] = useActionState(createComment, initialState);
  const [body, setBody] = useState(draft?.body ?? "");
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const saving = useRef(false);
  const defaultStake =
    draft?.stake_hp ??
    (availableHp >= DEFAULT_COMMENT_STAKE_HP
      ? DEFAULT_COMMENT_STAKE_HP
      : Math.max(availableHp, 1));

  async function persistDraft() {
    if (!canStake || saving.current || !body.trim()) {
      return;
    }

    saving.current = true;
    const form = new FormData();
    form.set("kind", "comment");
    form.set("postId", postId);
    form.set("body", body);
    const result = await saveDraft({}, form);
    setDraftNote(result.error ?? (result.id ? "Draft saved." : null));
    saving.current = false;
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void persistDraft();
    }, 1800);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  return (
    <form
      key={state.stamp ?? "new-comment"}
      action={action}
      className="flex flex-col gap-3 border-b border-border p-4"
    >
      <input type="hidden" name="postId" value={postId} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted-foreground">Add a comment</span>
        <textarea
          name="body"
          required
          rows={4}
          maxLength={COMMENT_BODY_MAX}
          disabled={!canStake || pending}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            canStake
              ? "Thesis, objection, or addendum. Markdown and images are welcome."
              : (closedReason ??
                "View-only desk. Comments require a matching or lower-tier book.")
          }
          className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] leading-relaxed text-foreground outline-none focus-visible:border-ring disabled:opacity-50"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <ImageAttachButton
          disabled={!canStake || pending}
          onInsert={(markdown) => setBody((current) => `${current}${markdown}`)}
        />
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Stake
          <input
            name="stakeHp"
            type="number"
            min={1}
            max={Math.min(MAX_STAKE_HP, Math.max(availableHp, 1))}
            step={1}
            required
            defaultValue={defaultStake}
            disabled={!canStake || pending}
            className="h-8 w-20 rounded-md border border-border bg-background px-2 text-[13px] disabled:opacity-50"
          />
          HP
        </label>
        <button
          type="button"
          onClick={() => void persistDraft()}
          disabled={!canStake || !body.trim()}
          className="text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="submit"
          disabled={!canStake || pending || availableHp < 1}
          className="ml-auto rounded-md bg-secondary px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Posting…" : "Comment"}
        </button>
      </div>
      {draftNote ? (
        <p className="text-[12px] text-muted-foreground">{draftNote}</p>
      ) : null}
      {state.error ? (
        <p className="text-[13px] text-loss">{state.error}</p>
      ) : null}
    </form>
  );
}
