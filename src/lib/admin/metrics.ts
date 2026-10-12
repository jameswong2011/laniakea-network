import type { SupabaseClient } from "@supabase/supabase-js";
import { TREASURY_PROFILE_ID } from "@/lib/research/referral";
import { createServiceClient } from "@/lib/supabase/admin";

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export type AdminUserRow = {
  id: string;
  username: string;
  displayName: string;
  tier: string;
  role: string;
  hp: number;
  utl: number;
  invitedBy: string | null;
  joinedAt: string;
  lastActive: string | null;
  posts24: number;
  comments24: number;
  posts7: number;
  comments7: number;
  llmCalls: number;
  llmTokens: number;
  llmCost: number;
  referralUtl: number;
  invitees: number;
};

export type InviteNode = {
  id: string;
  username: string;
  displayName: string;
  tier: string;
  referralUtl: number;
  children: InviteNode[];
};

export type AdminMetrics = {
  error: string | null;
  usageMissing: boolean;
  capped: string[];
  users: number;
  signups7: number;
  signups30: number;
  dau: number;
  wau: number;
  mau: number;
  posts24: number;
  comments24: number;
  postsPerUserHour: number;
  commentsPerUserHour: number;
  liveNotes: number;
  comments: number;
  hpOutstanding: number;
  utlOutstanding: number;
  pnl7: Pnl;
  pnl30: Pnl;
  pnlAll: Pnl;
  llm: LlmTotals;
  llmByFeature: { feature: string; calls: number; tokens: number; cost: number }[];
  people: AdminUserRow[];
  tree: InviteNode[];
  retention7: Cohort;
  retention30: Cohort;
  funnel: InviteFunnel;
  unitCost: { ask: UnitCost; summary: UnitCost; search: UnitCost };
  hpTopTenShare: number;
  hpTopTen: number;
};

export type Pnl = {
  gross: number;
  creator: number;
  referral: number;
  burn: number;
  dust: number;
  events: number;
};

export type LlmTotals = {
  calls: number;
  tokens: number;
  cost: number;
  calls24: number;
  tokens24: number;
  cost24: number;
};

export type Cohort = {
  eligible: number;
  retained: number;
  share: number;
};

export type InviteFunnel = {
  minted: number;
  redeemed: number;
  published: number;
  publishShare: number;
  missing: boolean;
};

export type UnitCost = {
  calls: number;
  cost: number;
  each: number;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  tier: string;
  role: string;
  current_hp: number;
  utility_tokens: number | null;
  invited_by: string | null;
  created_at: string;
};

type Stamp = { user_id: string; created_at: string };

function missing(message: string) {
  return (
    message.includes("does not exist") ||
    message.includes("42703") ||
    message.includes("42P01") ||
    message.includes("schema cache")
  );
}

function since(ms: number, now: number) {
  return now - ms;
}

function countSince(rows: Stamp[], floor: number) {
  return rows.filter((row) => new Date(row.created_at).getTime() >= floor).length;
}

function usersSince(rows: Stamp[], floor: number) {
  return new Set(
    rows.filter((row) => new Date(row.created_at).getTime() >= floor).map((row) => row.user_id)
  );
}

const PAGE_ROWS = 1000;

type NewestRows<T> = { data: T[]; error: { message: string } | null; capped: boolean };

async function readNewest<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  cap: number
): Promise<NewestRows<T>> {
  const rows: T[] = [];

  for (let from = 0; from < cap; from += PAGE_ROWS) {
    const size = Math.min(PAGE_ROWS, cap - from);
    const { data, error } = await page(from, from + size - 1);

    if (error) {
      return { data: rows, error, capped: false };
    }

    rows.push(...(data ?? []));

    if ((data ?? []).length < size) {
      return { data: rows, error: null, capped: false };
    }
  }

  return { data: rows, error: null, capped: true };
}

export async function loadAdminMetrics(session: SupabaseClient): Promise<AdminMetrics> {
  const supabase = createServiceClient() ?? session;
  const now = Date.now();
  const dayFloor = since(DAY, now);
  const weekFloor = since(WEEK, now);
  const monthFloor = since(MONTH, now);
  const newest = { ascending: false };

  const [profiles, posts, comments, votes, revenue, referrals, usage, invites] = await Promise.all([
    readNewest<ProfileRow>(
      (from, to) =>
        supabase
          .from("profiles")
          .select("id, username, display_name, tier, role, current_hp, utility_tokens, invited_by, created_at")
          .neq("id", TREASURY_PROFILE_ID)
          .order("created_at", newest)
          .range(from, to),
      20000
    ),
    readNewest<{ author_id: string; status: string; created_at: string }>(
      (from, to) =>
        supabase
          .from("research_posts")
          .select("author_id, status, created_at")
          .order("created_at", newest)
          .range(from, to),
      10000
    ),
    readNewest<{ author_id: string; created_at: string }>(
      (from, to) =>
        supabase
          .from("research_comments")
          .select("author_id, created_at")
          .order("created_at", newest)
          .range(from, to),
      20000
    ),
    readNewest<Stamp>(
      (from, to) =>
        supabase
          .from("votes")
          .select("user_id, created_at")
          .order("created_at", newest)
          .range(from, to),
      20000
    ),
    readNewest<{
      gross: number;
      creator_share: number;
      platform_burn: number;
      dust: number;
      referral_pool: number;
      created_at: string;
    }>(
      (from, to) =>
        supabase
          .from("revenue_events")
          .select("gross, creator_share, platform_burn, dust, referral_pool, created_at")
          .order("created_at", newest)
          .range(from, to),
      10000
    ),
    readNewest<{ beneficiary_id: string | null; amount: number }>(
      (from, to) =>
        supabase
          .from("revenue_distributions")
          .select("beneficiary_id, amount")
          .eq("kind", "referral_keep")
          .order("created_at", newest)
          .range(from, to),
      20000
    ),
    readNewest<{
      user_id: string | null;
      feature: string;
      total_tokens: number;
      cost_usd: number;
      created_at: string;
    }>(
      (from, to) =>
        supabase
          .from("ai_usage")
          .select("user_id, feature, total_tokens, cost_usd, created_at")
          .order("created_at", newest)
          .range(from, to),
      20000
    ),
    readNewest<{ status?: string; redeemed_by?: string | null }>(
      (from, to) =>
        supabase
          .from("invite_codes")
          .select("status, redeemed_by")
          .order("created_at", newest)
          .range(from, to),
      20000
    ),
  ]);

  const usageMissing = Boolean(usage.error && missing(usage.error.message));
  const peopleRows = profiles.data;

  if (profiles.error) {
    return emptyMetrics(profiles.error.message, usageMissing);
  }

  const capped = [
    profiles.capped ? "users" : null,
    posts.capped ? "notes" : null,
    comments.capped ? "comments" : null,
    votes.capped ? "votes" : null,
    revenue.capped ? "revenue events" : null,
    referrals.capped ? "referral payouts" : null,
    usage.capped ? "model calls" : null,
    invites.capped ? "invite codes" : null,
  ].filter((label): label is string => Boolean(label));

  const postRows = posts.error ? [] : posts.data;
  const commentRows = comments.error ? [] : comments.data;
  const voteRows = votes.error ? [] : votes.data;
  const activity: Stamp[] = [
    ...postRows.map((row) => ({ user_id: row.author_id, created_at: row.created_at })),
    ...commentRows.map((row) => ({ user_id: row.author_id, created_at: row.created_at })),
    ...voteRows,
  ];

  const dau = usersSince(activity, dayFloor).size;
  const wau = usersSince(activity, weekFloor).size;
  const mau = usersSince(activity, monthFloor).size;
  const posts24 = countSince(
    postRows.map((row) => ({ user_id: row.author_id, created_at: row.created_at })),
    dayFloor
  );
  const comments24 = countSince(
    commentRows.map((row) => ({ user_id: row.author_id, created_at: row.created_at })),
    dayFloor
  );
  const posters24 = usersSince(
    postRows.map((row) => ({ user_id: row.author_id, created_at: row.created_at })),
    dayFloor
  ).size;
  const commenters24 = usersSince(
    commentRows.map((row) => ({ user_id: row.author_id, created_at: row.created_at })),
    dayFloor
  ).size;

  const revenueRows = revenue.error ? [] : revenue.data;
  const usageRows = usage.error ? [] : usage.data;

  const referralByUser = new Map<string, number>();
  for (const row of referrals.error ? [] : referrals.data) {
    const id = row.beneficiary_id;
    if (!id) {
      continue;
    }
    referralByUser.set(id, (referralByUser.get(id) ?? 0) + Number(row.amount));
  }

  const inviteesByUser = new Map<string, number>();
  for (const person of peopleRows) {
    if (!person.invited_by) {
      continue;
    }
    inviteesByUser.set(person.invited_by, (inviteesByUser.get(person.invited_by) ?? 0) + 1);
  }

  const lastActive = new Map<string, number>();
  const posts24By = new Map<string, number>();
  const posts7By = new Map<string, number>();
  const comments24By = new Map<string, number>();
  const comments7By = new Map<string, number>();

  function bump(map: Map<string, number>, id: string) {
    map.set(id, (map.get(id) ?? 0) + 1);
  }

  for (const row of activity) {
    const at = new Date(row.created_at).getTime();
    lastActive.set(row.user_id, Math.max(lastActive.get(row.user_id) ?? 0, at));
  }

  for (const row of postRows) {
    const at = new Date(row.created_at).getTime();
    if (at >= dayFloor) {
      bump(posts24By, row.author_id);
    }
    if (at >= weekFloor) {
      bump(posts7By, row.author_id);
    }
  }

  for (const row of commentRows) {
    const at = new Date(row.created_at).getTime();
    if (at >= dayFloor) {
      bump(comments24By, row.author_id);
    }
    if (at >= weekFloor) {
      bump(comments7By, row.author_id);
    }
  }

  const llmByUser = new Map<string, { calls: number; tokens: number; cost: number }>();
  const featureMap = new Map<string, { calls: number; tokens: number; cost: number }>();
  let llm: LlmTotals = { calls: 0, tokens: 0, cost: 0, calls24: 0, tokens24: 0, cost24: 0 };

  for (const row of usageRows) {
    const tokens = Number(row.total_tokens) || 0;
    const cost = Number(row.cost_usd) || 0;
    const at = new Date(row.created_at).getTime();
    llm = {
      calls: llm.calls + 1,
      tokens: llm.tokens + tokens,
      cost: llm.cost + cost,
      calls24: llm.calls24 + (at >= dayFloor ? 1 : 0),
      tokens24: llm.tokens24 + (at >= dayFloor ? tokens : 0),
      cost24: llm.cost24 + (at >= dayFloor ? cost : 0),
    };
    const feature = featureMap.get(row.feature) ?? { calls: 0, tokens: 0, cost: 0 };
    featureMap.set(row.feature, {
      calls: feature.calls + 1,
      tokens: feature.tokens + tokens,
      cost: feature.cost + cost,
    });
    if (row.user_id) {
      const current = llmByUser.get(row.user_id) ?? { calls: 0, tokens: 0, cost: 0 };
      llmByUser.set(row.user_id, {
        calls: current.calls + 1,
        tokens: current.tokens + tokens,
        cost: current.cost + cost,
      });
    }
  }

  const people: AdminUserRow[] = peopleRows
    .map((person) => {
      const model = llmByUser.get(person.id);
      const seen = lastActive.get(person.id);
      return {
        id: person.id,
        username: person.username,
        displayName: person.display_name,
        tier: person.tier,
        role: person.role,
        hp: person.current_hp,
        utl: person.utility_tokens ?? 0,
        invitedBy: person.invited_by,
        joinedAt: person.created_at,
        lastActive: seen ? new Date(seen).toISOString() : null,
        posts24: posts24By.get(person.id) ?? 0,
        comments24: comments24By.get(person.id) ?? 0,
        posts7: posts7By.get(person.id) ?? 0,
        comments7: comments7By.get(person.id) ?? 0,
        llmCalls: model?.calls ?? 0,
        llmTokens: model?.tokens ?? 0,
        llmCost: model?.cost ?? 0,
        referralUtl: referralByUser.get(person.id) ?? 0,
        invitees: inviteesByUser.get(person.id) ?? 0,
      };
    })
    .sort((a, b) => {
      const left = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      const right = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      return right - left;
    });

  return {
    error: posts.error && !missing(posts.error.message) ? posts.error.message : null,
    usageMissing,
    capped,
    users: people.length,
    signups7: peopleRows.filter((row) => new Date(row.created_at).getTime() >= weekFloor).length,
    signups30: peopleRows.filter((row) => new Date(row.created_at).getTime() >= monthFloor).length,
    dau,
    wau,
    mau,
    posts24,
    comments24,
    postsPerUserHour: posters24 ? posts24 / posters24 / 24 : 0,
    commentsPerUserHour: commenters24 ? comments24 / commenters24 / 24 : 0,
    liveNotes: postRows.filter((row) => row.status === "live").length,
    comments: commentRows.length,
    hpOutstanding: peopleRows.reduce((sum, row) => sum + Number(row.current_hp), 0),
    utlOutstanding: peopleRows.reduce((sum, row) => sum + Number(row.utility_tokens ?? 0), 0),
    pnl7: pnl(revenueRows, weekFloor),
    pnl30: pnl(revenueRows, monthFloor),
    pnlAll: pnl(revenueRows, 0),
    llm,
    llmByFeature: [...featureMap.entries()]
      .map(([feature, row]) => ({ feature, ...row }))
      .sort((a, b) => b.calls - a.calls),
    people,
    tree: inviteTree(people),
    retention7: cohort(people, 7, now),
    retention30: cohort(people, 30, now),
    funnel: inviteFunnel(invites, new Set(postRows.map((row) => row.author_id))),
    unitCost: {
      ask: unitCost(featureMap, "ask"),
      summary: unitCost(featureMap, "brief"),
      search: unitCost(featureMap, "search"),
    },
    hpTopTenShare: hpShare(people).share,
    hpTopTen: hpShare(people).held,
  };
}

function pnl(
  rows: {
    gross: number;
    creator_share: number;
    platform_burn: number;
    dust: number;
    referral_pool: number;
    created_at: string;
  }[],
  floor: number
): Pnl {
  const slice = rows.filter((row) => new Date(row.created_at).getTime() >= floor);
  return {
    gross: slice.reduce((sum, row) => sum + Number(row.gross), 0),
    creator: slice.reduce((sum, row) => sum + Number(row.creator_share), 0),
    referral: slice.reduce((sum, row) => sum + Number(row.referral_pool), 0),
    burn: slice.reduce((sum, row) => sum + Number(row.platform_burn), 0),
    dust: slice.reduce((sum, row) => sum + Number(row.dust ?? 0), 0),
    events: slice.length,
  };
}

function inviteTree(people: AdminUserRow[]): InviteNode[] {
  const byParent = new Map<string, AdminUserRow[]>();
  const ids = new Set(people.map((person) => person.id));

  for (const person of people) {
    if (!person.invitedBy || !ids.has(person.invitedBy)) {
      continue;
    }
    const list = byParent.get(person.invitedBy) ?? [];
    list.push(person);
    byParent.set(person.invitedBy, list);
  }

  function node(person: AdminUserRow, depth: number): InviteNode {
    const children =
      depth > 8
        ? []
        : (byParent.get(person.id) ?? [])
            .sort((a, b) => b.referralUtl - a.referralUtl)
            .map((child) => node(child, depth + 1));
    return {
      id: person.id,
      username: person.username,
      displayName: person.displayName,
      tier: person.tier,
      referralUtl: person.referralUtl,
      children,
    };
  }

  return people
    .filter((person) => !person.invitedBy || !ids.has(person.invitedBy))
    .filter((person) => (byParent.get(person.id) ?? []).length > 0 || person.referralUtl > 0)
    .sort((a, b) => b.referralUtl - a.referralUtl || b.invitees - a.invitees)
    .map((person) => node(person, 0));
}

function cohort(people: AdminUserRow[], days: number, now: number): Cohort {
  const span = days * DAY;
  const eligible = people.filter((person) => now - new Date(person.joinedAt).getTime() >= span);
  const retained = eligible.filter((person) => {
    if (!person.lastActive) {
      return false;
    }
    return new Date(person.lastActive).getTime() >= new Date(person.joinedAt).getTime() + span;
  });
  return {
    eligible: eligible.length,
    retained: retained.length,
    share: eligible.length ? retained.length / eligible.length : 0,
  };
}

function inviteFunnel(
  invites: { error: { message: string } | null; data: { status?: string; redeemed_by?: string | null }[] | null },
  authors: Set<string>
): InviteFunnel {
  if (invites.error) {
    return { minted: 0, redeemed: 0, published: 0, publishShare: 0, missing: missing(invites.error.message) };
  }
  const rows = invites.data ?? [];
  const redeemed = rows.filter((row) => row.status === "redeemed" && row.redeemed_by);
  const published = new Set(redeemed.map((row) => row.redeemed_by).filter((id): id is string => Boolean(id && authors.has(id))));
  return {
    minted: rows.length,
    redeemed: redeemed.length,
    published: published.size,
    publishShare: redeemed.length ? published.size / redeemed.length : 0,
    missing: false,
  };
}

function unitCost(features: Map<string, { calls: number; tokens: number; cost: number }>, feature: string): UnitCost {
  const row = features.get(feature);
  if (!row || row.calls === 0) {
    return { calls: 0, cost: 0, each: 0 };
  }
  return { calls: row.calls, cost: row.cost, each: row.cost / row.calls };
}

function hpShare(people: AdminUserRow[]) {
  const total = people.reduce((sum, person) => sum + person.hp, 0);
  const held = [...people]
    .sort((a, b) => b.hp - a.hp)
    .slice(0, 10)
    .reduce((sum, person) => sum + person.hp, 0);
  return { held, share: total ? held / total : 0 };
}

export function usersCsv(people: AdminUserRow[]) {
  const header = [
    "username",
    "display_name",
    "tier",
    "role",
    "joined_at",
    "last_active",
    "posts_24h",
    "comments_24h",
    "posts_7d",
    "comments_7d",
    "llm_calls",
    "llm_tokens",
    "llm_cost_usd",
    "hp",
    "utl",
    "referral_utl",
    "direct_invitees",
  ];
  const lines = people.map((person) =>
    [
      person.username,
      person.displayName,
      person.tier,
      person.role,
      person.joinedAt,
      person.lastActive ?? "",
      person.posts24,
      person.comments24,
      person.posts7,
      person.comments7,
      person.llmCalls,
      person.llmTokens,
      person.llmCost,
      person.hp,
      person.utl,
      person.referralUtl,
      person.invitees,
    ].map(csvCell).join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function invitesCsv(nodes: InviteNode[]) {
  const header = ["depth", "username", "display_name", "tier", "referral_utl", "parent"];
  const lines: string[] = [];

  function walk(node: InviteNode, depth: number, parent: string) {
    lines.push(
      [depth, node.username, node.displayName, node.tier, node.referralUtl, parent].map(csvCell).join(",")
    );
    for (const child of node.children) {
      walk(child, depth + 1, node.username);
    }
  }

  for (const node of nodes) {
    walk(node, 0, "");
  }

  return [header.join(","), ...lines].join("\n");
}

function csvCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function emptyMetrics(error: string, usageMissing: boolean): AdminMetrics {
  const zero: Pnl = { gross: 0, creator: 0, referral: 0, burn: 0, dust: 0, events: 0 };
  return {
    error,
    usageMissing,
    capped: [],
    users: 0,
    signups7: 0,
    signups30: 0,
    dau: 0,
    wau: 0,
    mau: 0,
    posts24: 0,
    comments24: 0,
    postsPerUserHour: 0,
    commentsPerUserHour: 0,
    liveNotes: 0,
    comments: 0,
    hpOutstanding: 0,
    utlOutstanding: 0,
    pnl7: zero,
    pnl30: zero,
    pnlAll: zero,
    llm: { calls: 0, tokens: 0, cost: 0, calls24: 0, tokens24: 0, cost24: 0 },
    llmByFeature: [],
    people: [],
    tree: [],
    retention7: { eligible: 0, retained: 0, share: 0 },
    retention30: { eligible: 0, retained: 0, share: 0 },
    funnel: { minted: 0, redeemed: 0, published: 0, publishShare: 0, missing: false },
    unitCost: {
      ask: { calls: 0, cost: 0, each: 0 },
      summary: { calls: 0, cost: 0, each: 0 },
      search: { calls: 0, cost: 0, each: 0 },
    },
    hpTopTenShare: 0,
    hpTopTen: 0,
  };
}
