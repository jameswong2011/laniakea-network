"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createResearchPost,
  type FeedActionState,
} from "@/app/(dashboard)/feed/actions";
import { ImageAttachButton } from "@/components/laniakea/ImageAttachButton";
import { SubTopicSelect } from "@/components/laniakea/SubTopicSelect";
import { TierBadge } from "@/components/laniakea/TierBadge";
import { nextTier } from "@/lib/research/access";
import { DEFAULT_STAKE_HP, MAX_STAKE_HP } from "@/lib/research/economy";
import {
  DEFAULT_UNLOCK_RATE_MULTIPLE,
  UNLOCK_BASE_RATES,
  UNLOCK_RATE_MULTIPLE_MAX,
  UNLOCK_RATE_MULTIPLE_MIN,
  unlockQuotesForAuthor,
} from "@/lib/research/unlock";
import { TIER_LABELS, type Tier } from "@/types";

const initialState: FeedActionState = {};

const fieldClassName =
  "h-8 w-full border border-border bg-panel-elevated px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring";

export function NewResearchForm({
  availableHp,
  deskTier,
}: {
  availableHp: number;
  deskTier: Tier;
}) {
  const [state, action, pending] = useActionState(
    createResearchPost,
    initialState
  );
  const [unlockMultiple, setUnlockMultiple] = useState(
    DEFAULT_UNLOCK_RATE_MULTIPLE
  );
  const [body, setBody] = useState("");
  const defaultStake =
    availableHp >= DEFAULT_STAKE_HP ? DEFAULT_STAKE_HP : Math.max(availableHp, 1);
  const canPost = availableHp >= 1;
  const visibleAbove = nextTier(deskTier);
  const buyerQuotes = unlockQuotesForAuthor(deskTier, unlockMultiple);
  const pricedBook = UNLOCK_BASE_RATES.map((base) => base * unlockMultiple).join(
    " / "
  );

  return (
    <section className="rounded-xl border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-medium text-foreground">New note</h2>
          <TierBadge tier={deskTier} />
        </div>
        <Link
          href="/wallet"
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          Wallet {new Intl.NumberFormat("en-US").format(availableHp)} HP
        </Link>
      </div>
      <form
        key={state.stamp ?? "new-post"}
        action={action}
        className="flex flex-col gap-4 p-4"
      >
        <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_13rem]">
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted-foreground">Title</span>
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Research title"
              className={fieldClassName}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted-foreground">Sub-topic</span>
            <SubTopicSelect />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted-foreground">
            Body · markdown, images, and links
          </span>
          <textarea
            name="body"
            required
            rows={8}
            maxLength={20000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Thesis, evidence, and risk."
            className="min-h-40 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] leading-relaxed text-foreground outline-none focus-visible:border-ring"
          />
        </label>
        <ImageAttachButton
          disabled={pending}
          onInsert={(markdown) => setBody((current) => `${current}${markdown}`)}
        />
        <p className="font-data text-[11px] text-muted-foreground">
          Publishes to your {TIER_LABELS[deskTier]} desk.
          {visibleAbove
            ? ` ${TIER_LABELS[visibleAbove]} is view-only unless they pay UTL. Desks further above stay locked until they unlock this note.`
            : " You are on the top desk."}
        </p>
        <div className="grid gap-2.5 md:grid-cols-[12rem_minmax(0,1fr)]">
          <label className="flex flex-col gap-1">
            <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              HP to stake (max {MAX_STAKE_HP})
            </span>
            <input
              name="stakeHp"
              type="number"
              min={1}
              max={Math.min(MAX_STAKE_HP, Math.max(availableHp, 1))}
              step={1}
              required
              defaultValue={defaultStake}
              className={`${fieldClassName} font-data`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Unlock rate
            </span>
            <select
              name="unlockRateMultiple"
              value={unlockMultiple}
              onChange={(event) => {
                setUnlockMultiple(Number(event.target.value));
              }}
              className={`${fieldClassName} font-data`}
            >
              {Array.from(
                {
                  length:
                    UNLOCK_RATE_MULTIPLE_MAX - UNLOCK_RATE_MULTIPLE_MIN + 1,
                },
                (_, index) => UNLOCK_RATE_MULTIPLE_MIN + index
              ).map((multiple) => (
                <option key={multiple} value={multiple}>
                  {multiple}× default
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="font-data text-[11px] text-muted-foreground">
          Lower desks pay {pricedBook} UTL to open a note 1 / 2 / 3 / 4 desks
          above them. 75% of that UTL comes to you; 25% is burned.
          {buyerQuotes.length > 0
            ? ` On this desk: ${buyerQuotes
                .map(
                  (quote) =>
                    `${TIER_LABELS[quote.buyer]} ${quote.tokens} UTL`
                )
                .join(", ")}.`
            : " No desk is below Bronze; the rate applies if you are promoted."}
        </p>
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
          className="h-9 w-fit rounded-md bg-secondary px-4 text-[14px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Publishing…" : "Publish"}
        </button>
      </form>
    </section>
  );
}
