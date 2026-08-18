"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { researchPostPath } from "@/lib/research/feed";
import {
  isMissingUnlockSchema,
  missingUnlockSchemaMessage,
} from "@/lib/research/unlock";

export type UnlockActionState = {
  error?: string;
  message?: string;
  stamp?: number;
};

const unlockSchema = z.object({
  postId: z.string().uuid("Invalid post."),
});

function refreshUnlock(postId: string) {
  revalidatePath(researchPostPath(postId));
  revalidatePath("/feed");
  revalidatePath("/feed", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/wallet");
}

export async function unlockHigherDeskPost(
  _prevState: UnlockActionState,
  formData: FormData
): Promise<UnlockActionState> {
  const { supabase } = await requireUser();
  const parsed = unlockSchema.safeParse({ postId: formData.get("postId") });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid unlock.",
      stamp: Date.now(),
    };
  }

  const { postId } = parsed.data;
  const { data, error } = await supabase.rpc("purchase_post_unlock", {
    p_post_id: postId,
  });

  if (error) {
    return { error: rpcError(error.message), stamp: Date.now() };
  }

  const receipt = unlockReceipt(data);

  refreshUnlock(postId);
  return {
    message: receipt
      ? `Unlocked for ${receipt.tokens} UTL. ${receipt.authorShare} to the author, ${receipt.burned} burned.`
      : "Unlocked.",
    stamp: Date.now(),
  };
}

function unlockReceipt(data: unknown) {
  let parsed: unknown = data;

  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
  const row =
    parsed && typeof parsed === "object"
      ? (parsed as {
          tokens?: unknown;
          authorShare?: unknown;
          burned?: unknown;
        })
      : null;

  if (
    !row ||
    typeof row.tokens !== "number" ||
    typeof row.authorShare !== "number" ||
    typeof row.burned !== "number"
  ) {
    return null;
  }

  return {
    tokens: row.tokens,
    authorShare: row.authorShare,
    burned: row.burned,
  };
}

function rpcError(message: string) {
  if (isMissingUnlockSchema(message) || message.includes("purchase_post_unlock")) {
    return missingUnlockSchemaMessage();
  }

  return message.replace(/^ERROR:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/, "");
}
