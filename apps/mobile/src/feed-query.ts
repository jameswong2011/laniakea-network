import { FEED_POSTED, FEED_POSTED_LABELS, type FeedPosted, TIERS, type Tier } from "./domain";
import { SUB_TOPICS, type SubTopic } from "../../../src/types";

export const FEED_STATUSES = ["battleground", "ascended", "hunted"] as const;
export type FeedStatus = (typeof FEED_STATUSES)[number];

export const FEED_STATUS_LABELS: Record<FeedStatus, string> = {
  battleground: "Battleground",
  ascended: "Ascended",
  hunted: "Hunted",
};

export const DEFAULT_FEED_STATUSES: FeedStatus[] = ["battleground", "ascended"];

export type FeedQuery = {
  topics: SubTopic[] | null;
  tiers: Tier[] | null;
  statuses: FeedStatus[] | null;
  posted: FeedPosted | null;
};

export const EMPTY_FEED_QUERY: FeedQuery = {
  topics: null,
  tiers: null,
  statuses: null,
  posted: null,
};

function normalize<T extends string>(next: T[], all: readonly T[], fallback: T[] | null) {
  if (next.length === 0) {
    return [] as T[];
  }

  if (next.length === all.length) {
    return null;
  }

  if (
    fallback &&
    next.length === fallback.length &&
    fallback.every((item) => next.includes(item))
  ) {
    return null;
  }

  return next;
}

export function toggleStatus(selected: FeedStatus[] | null, status: FeedStatus) {
  const current = selected ?? [...DEFAULT_FEED_STATUSES];
  const next = current.includes(status)
    ? current.filter((item) => item !== status)
    : [...current, status];

  return normalize(next, FEED_STATUSES, DEFAULT_FEED_STATUSES);
}

export function toggleTier(selected: Tier[] | null, tier: Tier) {
  const current = selected ?? [...TIERS];
  const next = current.includes(tier)
    ? current.filter((item) => item !== tier)
    : [...current, tier];

  return normalize(next, TIERS, null);
}

export function toggleTopic(selected: SubTopic[] | null, topic: SubTopic) {
  const current = selected ?? [...SUB_TOPICS];
  const next = current.includes(topic)
    ? current.filter((item) => item !== topic)
    : [...current, topic];

  return normalize(next, SUB_TOPICS, null);
}

export { SUB_TOPICS, FEED_POSTED, FEED_POSTED_LABELS };
export type { SubTopic, FeedPosted };
