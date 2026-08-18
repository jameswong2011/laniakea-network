"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  isMissingInviteSchema,
  missingInviteSchemaMessage,
} from "@/lib/research/invite";

export type InviteActionState = {
  error?: string;
  message?: string;
  stamp?: number;
};

export async function buyInviteCode(
  _prevState: InviteActionState,
  _formData: FormData
): Promise<InviteActionState> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("buy_invite_code");

  if (error) {
    return {
      error: isMissingInviteSchema(error.message)
        ? missingInviteSchemaMessage()
        : error.message.replace(/^ERROR:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/, ""),
      stamp: Date.now(),
    };
  }

  const payload = data && typeof data === "object" ? (data as { code?: string; free?: boolean }) : {};
  const code = payload.code ? String(payload.code) : "";
  const free = payload.free === true;

  revalidatePath("/invites");
  revalidatePath("/wallet");
  revalidatePath("/dashboard");
  revalidatePath("/feed");

  if (free) {
    return {
      message: code ? `Minted invite ${code}. No UTL charged.` : "Minted one invite. No UTL charged.",
      stamp: Date.now(),
    };
  }

  return {
    message: code
      ? `Bought one invite for 100 UTL. Code ${code}.`
      : "Bought one invite for 100 UTL.",
    stamp: Date.now(),
  };
}
