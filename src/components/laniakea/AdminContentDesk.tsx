"use client";

import { useActionState } from "react";
import {
  deleteResearchComment,
  deleteResearchPost,
  updateResearchComment,
  updateResearchPost,
  type AdminActionState,
} from "@/app/admin/actions";

const initial: AdminActionState = {};

const field =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-[13px] text-foreground outline-none focus-visible:border-ring";

export function PostEditor({
  id,
  title,
  body,
  status,
  author,
}: {
  id: string;
  title: string;
  body: string;
  status: string;
  author: string;
}) {
  const [state, action, pending] = useActionState(updateResearchPost, initial);
  const [removed, remove, removing] = useActionState(deleteResearchPost, initial);

  return (
    <article className="border-b border-border px-3 py-3">
      <p className="font-data text-[11px] text-muted-foreground">{author}</p>
      <form action={action} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <input name="title" defaultValue={title} className={field} />
        <textarea name="body" defaultValue={body} rows={4} className={field} />
        <div className="flex flex-wrap items-center gap-2">
          <select name="status" defaultValue={status} className={`${field} w-auto`}>
            <option value="live">live</option>
            <option value="archived">archived</option>
            <option value="ascended">ascended</option>
            <option value="refunded">refunded</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="h-8 rounded-md bg-secondary px-3 text-[13px] disabled:opacity-50"
          >
            {pending ? "Saving" : "Save note"}
          </button>
        </div>
        {state.error ? <p className="text-[12px] text-loss">{state.error}</p> : null}
        {state.message ? <p className="text-[12px] text-gain">{state.message}</p> : null}
      </form>
      <form action={remove} className="mt-2">
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={removing} className="text-[12px] text-loss">
          {removing ? "Deleting" : "Delete note"}
        </button>
        {removed.error ? <p className="text-[12px] text-loss">{removed.error}</p> : null}
        {removed.message ? <p className="text-[12px] text-gain">{removed.message}</p> : null}
      </form>
    </article>
  );
}

export function CommentEditor({
  id,
  body,
  author,
  note,
}: {
  id: string;
  body: string;
  author: string;
  note: string;
}) {
  const [state, action, pending] = useActionState(updateResearchComment, initial);
  const [removed, remove, removing] = useActionState(deleteResearchComment, initial);

  return (
    <article className="border-b border-border px-3 py-3">
      <p className="font-data text-[11px] text-muted-foreground">
        {author} · {note}
      </p>
      <form action={action} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <textarea name="body" defaultValue={body} rows={3} className={field} />
        <button
          type="submit"
          disabled={pending}
          className="h-8 w-fit rounded-md bg-secondary px-3 text-[13px] disabled:opacity-50"
        >
          {pending ? "Saving" : "Save comment"}
        </button>
        {state.error ? <p className="text-[12px] text-loss">{state.error}</p> : null}
        {state.message ? <p className="text-[12px] text-gain">{state.message}</p> : null}
      </form>
      <form action={remove} className="mt-2">
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={removing} className="text-[12px] text-loss">
          {removing ? "Deleting" : "Delete comment"}
        </button>
        {removed.error ? <p className="text-[12px] text-loss">{removed.error}</p> : null}
        {removed.message ? <p className="text-[12px] text-gain">{removed.message}</p> : null}
      </form>
    </article>
  );
}
