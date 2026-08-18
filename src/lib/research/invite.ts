import type { SupabaseClient } from "@supabase/supabase-js";
import { TREASURY_PROFILE_ID } from "@/lib/research/referral";

export type InviteCodeRow = {
  id: string;
  code: string;
  owner_id: string;
  status: "available" | "redeemed" | "revoked";
  redeemed_by: string | null;
  redeemed_at: string | null;
  minted_how: "signup_grant" | "token_purchase";
  created_at: string;
};

export type InviteeRow = {
  id: string;
  username: string;
  display_name: string;
  tier: string;
  created_at: string;
};

export type ReferralLine = {
  id: string;
  amount: number;
  depth: number;
  kind: string;
  created_at: string;
  action: string | null;
};

export function isMissingInviteSchema(message: string) {
  return (
    (message.includes("invite_codes") ||
      message.includes("token_ledger") ||
      message.includes("finalize_signup") ||
      message.includes("buy_invite_code") ||
      message.includes("buy_hp_with_referral") ||
      message.includes("account_code")) &&
    (message.includes("does not exist") ||
      message.includes("42703") ||
      message.includes("42P01") ||
      message.includes("42883"))
  );
}

export function missingInviteSchemaMessage() {
  return "Invite schema is missing. Run supabase/migrations/20260818123000_invite_referral.sql in the Supabase SQL editor, then refresh.";
}

export async function loadInviteDesk(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  codes: InviteCodeRow[];
  invitees: InviteeRow[];
  earnings: ReferralLine[];
  referralTotal: number;
  error: string | null;
}> {
  const codesRead = await supabase
    .from("invite_codes")
    .select(
      "id, code, owner_id, status, redeemed_by, redeemed_at, minted_how, created_at"
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (codesRead.error) {
    return {
      codes: [],
      invitees: [],
      earnings: [],
      referralTotal: 0,
      error: isMissingInviteSchema(codesRead.error.message)
        ? missingInviteSchemaMessage()
        : codesRead.error.message,
    };
  }

  const inviteesRead = await supabase
    .from("profiles")
    .select("id, username, display_name, tier, created_at")
    .eq("invited_by", userId)
    .neq("id", TREASURY_PROFILE_ID)
    .order("created_at", { ascending: false });

  const totalRead = await supabase
    .from("revenue_distributions")
    .select("amount")
    .eq("beneficiary_id", userId)
    .eq("kind", "referral_keep");

  const earningsRead = await supabase
    .from("revenue_distributions")
    .select("id, amount, depth, kind, created_at, event_id")
    .eq("beneficiary_id", userId)
    .eq("kind", "referral_keep")
    .order("created_at", { ascending: false })
    .limit(20);

  const eventIds = [
    ...new Set(
      (earningsRead.data ?? [])
        .map((row) => row.event_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const actions = new Map<string, string>();

  if (eventIds.length > 0) {
    const events = await supabase
      .from("revenue_events")
      .select("id, action")
      .in("id", eventIds);

    for (const event of events.data ?? []) {
      actions.set(event.id as string, event.action as string);
    }
  }

  const earnings: ReferralLine[] = (earningsRead.data ?? []).map((row) => ({
    id: row.id as string,
    amount: Number(row.amount),
    depth: Number(row.depth),
    kind: row.kind as string,
    created_at: row.created_at as string,
    action: actions.get(row.event_id as string) ?? null,
  }));

  return {
    codes: (codesRead.data ?? []) as InviteCodeRow[],
    invitees: (inviteesRead.data ?? []) as InviteeRow[],
    earnings,
    referralTotal: (totalRead.data ?? []).reduce(
      (sum, row) => sum + Number(row.amount),
      0
    ),
    error: null,
  };
}

export async function loadRevenueTotals(
  supabase: SupabaseClient,
  since: string
) {
  const { data, error } = await supabase
    .from("revenue_events")
    .select("creator_share, platform_burn, dust, referral_pool")
    .gte("created_at", since);

  if (error) {
    return {
      creatorShare: 0,
      platformBurn: 0,
      dust: 0,
      referralPool: 0,
      events: 0,
      error: isMissingInviteSchema(error.message)
        ? missingInviteSchemaMessage()
        : error.message,
    };
  }

  const rows = data ?? [];

  return {
    creatorShare: rows.reduce((sum, row) => sum + Number(row.creator_share), 0),
    platformBurn: rows.reduce((sum, row) => sum + Number(row.platform_burn), 0),
    dust: rows.reduce((sum, row) => sum + Number(row.dust ?? 0), 0),
    referralPool: rows.reduce((sum, row) => sum + Number(row.referral_pool), 0),
    events: rows.length,
    error: null,
  };
}
