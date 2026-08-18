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

  const code =
    data && typeof data === "object" && "code" in data
      ? String((data as { code?: string }).code ?? "")
      : "";

  revalidatePath("/invites");
  revalidatePath("/wallet");
  revalidatePath("/dashboard");
  revalidatePath("/feed");

  return {
    message: code
      ? `Bought one invite for 100 UTL. Code ${code}.`
      : "Bought one invite for 100 UTL.",
    stamp: Date.now(),
  };
}
