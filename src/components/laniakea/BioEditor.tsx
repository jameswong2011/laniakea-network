"use client";

import { useActionState } from "react";
import { updateBio, type ForumActionState } from "@/app/(dashboard)/forum/actions";
import { BIO_MAX } from "@/lib/research/forum";

const initialState: ForumActionState = {};

export function BioEditor({ bio }: { bio: string }) {
  const [state, action, pending] = useActionState(updateBio, initialState);

  return (
    <form action={action} className="flex flex-col gap-2 px-4 py-3">
      <label className="text-[13px] text-muted-foreground">
        Bio · {BIO_MAX} characters
      </label>
      <textarea
        name="bio"
        maxLength={BIO_MAX}
        defaultValue={bio}
        rows={3}
        placeholder="What you cover. What you are tracking."
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] leading-relaxed outline-none focus-visible:border-ring"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-secondary px-3 py-1.5 text-[13px] hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save bio"}
        </button>
        {state.error ? (
          <span className="text-[12px] text-loss">{state.error}</span>
        ) : null}
        {state.message ? (
          <span className="text-[12px] text-gain">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
