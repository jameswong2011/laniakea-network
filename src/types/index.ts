export const ROLES = ["admin", "elite", "member"] as const;
export type Role = (typeof ROLES)[number];

export const TIERS = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Masters",
] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABELS: Record<Tier, string> = {
  Bronze: "Bronze",
  Silver: "Silver",
  Gold: "Gold",
  Platinum: "Platinum",
  Masters: "Masters",
};

export const TIER_CODES: Record<Tier, string> = {
  Bronze: "BRZ",
  Silver: "SLV",
  Gold: "GLD",
  Platinum: "PLT",
  Masters: "MST",
};

export const TIER_RANK: Record<Tier, number> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Platinum: 4,
  Masters: 5,
};

export function isTier(value: string): value is Tier {
  return (TIERS as readonly string[]).includes(value);
}

export function resolveTier(value: string | null | undefined): Tier | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return TIERS.find((tier) => tier.toLowerCase() === normalized) ?? null;
}

export const SUB_TOPICS = [
  "Healthcare",
  "Banks",
  "Cybersecurity",
  "Technology",
  "Macro",
  "Energy",
] as const;
export type SubTopic = (typeof SUB_TOPICS)[number];

export const SUB_TOPIC_CODES: Record<SubTopic, string> = {
  Healthcare: "HLTH",
  Banks: "BANK",
  Cybersecurity: "CYBR",
  Technology: "TECH",
  Macro: "MACR",
  Energy: "ENRG",
};

export function isSubTopic(value: string): value is SubTopic {
  return (SUB_TOPICS as readonly string[]).includes(value);
}

export function resolveSubTopic(
  value: string | null | undefined
): SubTopic | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return (
    SUB_TOPICS.find((topic) => topic.toLowerCase() === normalized) ?? null
  );
}

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  tier: Tier;
  current_hp: number;
  utility_tokens: number;
  created_at: string;
  updated_at: string;
};

export const RESEARCH_POST_STATUS_LIVE = "live";
export const RESEARCH_POST_STATUS_ARCHIVED = "archived";
export const RESEARCH_POST_STATUS_ASCENDED = "ascended";

export type ResearchPostStatus =
  | typeof RESEARCH_POST_STATUS_LIVE
  | typeof RESEARCH_POST_STATUS_ARCHIVED
  | typeof RESEARCH_POST_STATUS_ASCENDED
  | string;

export type ResearchPost = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  status: ResearchPostStatus;
  current_health: number;
  original_stake: number;
  sub_topic: SubTopic | string;
  created_at: string;
  updated_at: string;
};

export type ResearchPostAuthor = Pick<
  Profile,
  "id" | "username" | "display_name" | "tier"
>;

export type FeedAccess = "full" | "view_only";

export type ResearchFeedItem = ResearchPost & {
  author: ResearchPostAuthor | null;
  authorTopicTier: Tier | null;
  deskTier: Tier | null;
  access: FeedAccess;
  commentCount?: number;
};

export const COMMENT_BODY_MAX = 8000;
export const REPLY_BODY_MAX = 2000;

export type ResearchComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  status: ResearchPostStatus;
  current_health: number;
  original_stake: number;
  created_at: string;
  updated_at: string;
};

export type CommentReply = {
  id: string;
  comment_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type CommentReplyView = CommentReply & {
  author: ResearchPostAuthor | null;
  likeCount: number;
  likedByViewer: boolean;
};

export type CommentThreadItem = ResearchComment & {
  author: ResearchPostAuthor | null;
  replies: CommentReplyView[];
};

export type SubtopicRank = {
  user_id: string;
  sub_topic: SubTopic | string;
  tier: Tier | string;
  current_hp: number;
  created_at: string;
  updated_at: string;
};

export const HP_TRANSACTION_STAKE = "stake";
export const HP_TRANSACTION_VOTE = "vote";
export const HP_TRANSACTION_DRAIN = "drain";
export const HP_TRANSACTION_BUY = "buy";
export const HP_TRANSACTION_CASHOUT = "cashout";
export const HP_TRANSACTION_CALIBRATION = "calibration";
export const HP_TRANSACTION_HUNT = "hunt";
export const HP_TRANSACTION_ASCENT = "ascent";

export type HpTransaction = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  post_id: string | null;
  comment_id?: string | null;
  created_at: string;
};

export const VOTE_UP = 1;
export const VOTE_DOWN = -1;
export const VOTE_STRENGTH_MIN = 1;
export const VOTE_STRENGTH_MAX = 5;

export type VoteDirection = "up" | "down";
export type VoteValue = number;

export function voteStrength(value: number) {
  return Math.abs(value);
}

export function isVoteStrength(value: number) {
  return (
    Number.isInteger(value) &&
    value >= VOTE_STRENGTH_MIN &&
    value <= VOTE_STRENGTH_MAX
  );
}

export function signedVoteValue(direction: VoteDirection, strength: number) {
  return direction === "up" ? strength : -strength;
}

export function isVoteValue(value: number): value is VoteValue {
  return value !== 0 && isVoteStrength(voteStrength(value));
}

export type Vote = {
  id: string;
  user_id: string;
  post_id: string;
  value: VoteValue | number;
  health_at_vote: number | null;
  created_at: string;
};
