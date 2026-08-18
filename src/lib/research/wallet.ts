import type { SupabaseClient } from "@supabase/supabase-js";
import {
  HP_TRANSACTION_ASCENT,
  HP_TRANSACTION_BUY,
  HP_TRANSACTION_CALIBRATION,
  HP_TRANSACTION_CASHOUT,
  HP_TRANSACTION_DRAIN,
  HP_TRANSACTION_HUNT,
  HP_TRANSACTION_REFUND,
  HP_TRANSACTION_STAKE,
  HP_TRANSACTION_VOTE,
  type HpTransaction,
  type ResearchPost,
} from "@/types";

const POST_ID_IN_TEXT =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export type WalletEntry = HpTransaction & {
  signedAmount: number;
  relatedPost: Pick<ResearchPost, "id" | "title" | "sub_topic"> | null;
};

export function relatedPostId(transaction: HpTransaction): string | null {
  if (transaction.post_id) {
    return transaction.post_id;
  }

  const match = transaction.description?.match(POST_ID_IN_TEXT);
  return match?.[0] ?? null;
}

export function signedLedgerAmount(type: string, amount: number) {
  if (
    type === HP_TRANSACTION_STAKE ||
    type === HP_TRANSACTION_VOTE ||
    type === HP_TRANSACTION_DRAIN ||
    type === HP_TRANSACTION_CASHOUT
  ) {
    return -Math.abs(amount);
  }

  if (
    type === HP_TRANSACTION_BUY ||
    type === HP_TRANSACTION_HUNT ||
    type === HP_TRANSACTION_ASCENT ||
    type === HP_TRANSACTION_REFUND
  ) {
    return Math.abs(amount);
  }

  if (type === HP_TRANSACTION_CALIBRATION) {
    return amount;
  }

  return amount;
}

export async function getWalletLedger(
  supabase: SupabaseClient,
  userId: string
): Promise<{ entries: WalletEntry[]; error: string | null }> {
  const withPostId = await supabase
    .from("hp_transactions")
    .select("id, user_id, amount, type, description, post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const legacy =
    withPostId.error && withPostId.error.message.includes("post_id")
      ? await supabase
          .from("hp_transactions")
          .select("id, user_id, amount, type, description, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      : null;

  const { data, error } = legacy ?? withPostId;

  if (error) {
    return { entries: [], error: error.message };
  }

  const transactions = ((data ?? []) as Array<
    Omit<HpTransaction, "post_id"> & { post_id?: string | null }
  >).map((row) => ({
    ...row,
    post_id: row.post_id ?? null,
  }));
  const postIds = [
    ...new Set(
      transactions
        .map((transaction) => relatedPostId(transaction))
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const postsById = new Map<
    string,
    Pick<ResearchPost, "id" | "title" | "sub_topic">
  >();

  if (postIds.length > 0) {
    const withTopic = await supabase
      .from("research_posts")
      .select("id, title, sub_topic")
      .in("id", postIds);

    const posts =
      withTopic.error && withTopic.error.message.includes("sub_topic")
        ? await supabase
            .from("research_posts")
            .select("id, title")
            .in("id", postIds)
        : withTopic;

    for (const post of (posts.data ?? []) as Array<
      Pick<ResearchPost, "id" | "title"> & { sub_topic?: string }
    >) {
      postsById.set(post.id, {
        id: post.id,
        title: post.title,
        sub_topic: post.sub_topic ?? "",
      });
    }
  }

  return {
    entries: transactions.map((transaction) => {
      const postId = relatedPostId(transaction);

      return {
        ...transaction,
        signedAmount: signedLedgerAmount(transaction.type, transaction.amount),
        relatedPost: postId ? (postsById.get(postId) ?? null) : null,
      };
    }),
    error: null,
  };
}
