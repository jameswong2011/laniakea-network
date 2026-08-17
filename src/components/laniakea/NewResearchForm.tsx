"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createResearchPost,
  type FeedActionState,
} from "@/app/(dashboard)/feed/actions";
import { SubTopicSelect } from "@/components/laniakea/SubTopicSelect";
import { DEFAULT_STAKE_HP } from "@/lib/research/economy";

const initialState: FeedActionState = {};

const fieldClassName =
  "h-8 w-full border border-border bg-panel-elevated px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring";

export function NewResearchForm({ availableHp }: { availableHp: number }) {
  const [state, action, pending] = useActionState(
    createResearchPost,
    initialState
  );
  const defaultStake =
    availableHp >= DEFAULT_STAKE_HP ? DEFAULT_STAKE_HP : Math.max(availableHp, 1);
  const canPost = availableHp >= 1;

  return (
    <section className="border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border bg-surface px-2.5 py-1.5">
        <h2 className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          New Research Post
        </h2>
        <Link
          href="/wallet"
          className="font-data text-[11px] text-muted-foreground hover:text-foreground"
        >
          Wallet {new Intl.NumberFormat("en-US").format(availableHp)} HP
        </Link>
      </div>
      <form
        key={state.stamp ?? "new-post"}
        action={action}
        className="flex flex-col gap-2.5 p-2.5"
      >
        <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_13rem]">
          <label className="flex flex-col gap-1">
            <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Title
            </span>
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Research title"
              className={fieldClassName}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Sub-topic
            </span>
            <SubTopicSelect />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Body
          </span>
          <textarea
            name="body"
            required
            rows={5}
            maxLength={20000}
            placeholder="Thesis, evidence, and risk."
            className="min-h-24 w-full border border-border bg-panel-elevated px-2.5 py-2 text-[13px] text-foreground outline-none focus-visible:border-ring"
          />
        </label>
        <label className="flex max-w-[12rem] flex-col gap-1">
          <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            HP to stake
          </span>
          <input
            name="stakeHp"
            type="number"
            min={1}
            max={Math.max(availableHp, 1)}
            step={1}
            required
            defaultValue={defaultStake}
            className={`${fieldClassName} font-data`}
          />
        </label>
        {!canPost ? (
          <p className="font-data text-[11px] text-warning">
            Not enough HP to publish.
          </p>
        ) : null}
        {state.error ? (
          <p className="font-data text-[11px] text-loss">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="font-data text-[11px] text-gain">{state.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending || !canPost}
          className="h-8 w-fit border border-border bg-secondary px-3 text-[12px] font-medium tracking-wide text-foreground hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Publishing…" : "Publish"}
        </button>
      </form>
    </section>
  );
}
