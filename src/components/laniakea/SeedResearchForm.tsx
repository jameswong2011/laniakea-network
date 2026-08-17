"use client";

import { useActionState, type ReactNode } from "react";
import { seedResearchPost, type AdminActionState } from "@/app/admin/actions";
import { SubTopicSelect } from "@/components/laniakea/SubTopicSelect";
import type { Profile } from "@/types";

type AuthorOption = Pick<Profile, "id" | "username" | "display_name">;

const initialState: AdminActionState = {};

const fieldClassName =
  "h-8 w-full border border-border bg-panel-elevated px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring";

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}

export function SeedResearchForm({ authors }: { authors: AuthorOption[] }) {
  const [state, action, pending] = useActionState(seedResearchPost, initialState);

  return (
    <form
      key={state.stamp ?? "seed-form"}
      action={action}
      className="grid gap-2.5 p-2.5 md:grid-cols-2"
    >
      <label className="flex flex-col gap-1 md:col-span-2">
        <FieldLabel>Title</FieldLabel>
        <input
          name="title"
          required
          maxLength={200}
          placeholder="Research title"
          className={fieldClassName}
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <FieldLabel>Body</FieldLabel>
        <textarea
          name="body"
          required
          rows={6}
          maxLength={20000}
          placeholder="Thesis, evidence, and risk."
          className="min-h-28 w-full border border-border bg-panel-elevated px-2.5 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring"
        />
      </label>

      <label className="flex flex-col gap-1">
        <FieldLabel>Author</FieldLabel>
        <select name="authorId" required className={fieldClassName} defaultValue="">
          <option value="" disabled>
            Select profile
          </option>
          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.display_name} (@{author.username})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <FieldLabel>Sub-topic</FieldLabel>
        <SubTopicSelect />
      </label>

      <label className="flex flex-col gap-1">
        <FieldLabel>Initial HP Stake</FieldLabel>
        <input
          name="initialHpStake"
          type="number"
          min={0}
          step={1}
          required
          defaultValue={100}
          className={`${fieldClassName} font-data`}
        />
      </label>

      {state.error ? (
        <p className="font-data text-[11px] text-loss md:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="font-data text-[11px] text-gain md:col-span-2">
          {state.message}
        </p>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending || authors.length === 0}
          className="h-8 border border-border bg-secondary px-3 text-[12px] font-medium tracking-wide text-foreground hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Seeding…" : "Seed research post"}
        </button>
      </div>
    </form>
  );
}
