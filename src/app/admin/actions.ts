"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { recordSubtopicParticipation } from "@/lib/research/subtopic-ranks";
import {
  RESEARCH_POST_STATUS_LIVE,
  ROLES,
  isSubTopic,
  resolveTier,
} from "@/types";

export type AdminActionState = {
  error?: string;
  message?: string;
  stamp?: number;
};

const updateProfileSchema = z.object({
  id: z.string().uuid("Invalid profile."),
  role: z
    .string()
    .trim()
    .refine((value): value is (typeof ROLES)[number] => {
      return (ROLES as readonly string[]).includes(value);
    }, "Role must be admin, elite, or member."),
  tier: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const tier = resolveTier(value);

      if (!tier) {
        ctx.addIssue({
          code: "custom",
          message: "Tier must be Bronze, Silver, Gold, Platinum, or Masters.",
        });
        return z.NEVER;
      }

      return tier;
    }),
  current_hp: z.coerce.number().int("HP must be a whole number."),
});

const seedPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  body: z.string().trim().min(1, "Body is required.").max(20000),
  authorId: z.string().uuid("Select an author."),
  subTopic: z
    .string()
    .trim()
    .refine(isSubTopic, {
      message: "Select a sub-topic.",
    }),
  initialHpStake: z.coerce
    .number()
    .int("Stake must be a whole number.")
    .min(0, "Stake cannot be negative."),
});

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid form data.";
}

export async function updateProfile(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireAdmin();
  const parsed = updateProfileSchema.safeParse({
    id: String(formData.get("id") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    tier: String(formData.get("tier") ?? "").trim(),
    current_hp: formData.get("current_hp"),
  });

  if (!parsed.success) {
    return { error: firstIssue(parsed.error), stamp: Date.now() };
  }

  const { id, role, tier, current_hp } = parsed.data;

  if (id === context.userId && role !== "admin") {
    return {
      error: "You cannot remove your own admin role.",
      stamp: Date.now(),
    };
  }

  const { error } = await context.supabase
    .from("profiles")
    .update({
      role,
      tier,
      current_hp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message, stamp: Date.now() };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/ranking");

  return { message: "Profile saved.", stamp: Date.now() };
}

export async function seedResearchPost(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const { supabase } = await requireAdmin();
  const parsed = seedPostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    authorId: formData.get("authorId"),
    subTopic: formData.get("subTopic"),
    initialHpStake: formData.get("initialHpStake"),
  });

  if (!parsed.success) {
    return { error: firstIssue(parsed.error), stamp: Date.now() };
  }

  const { title, body, authorId, subTopic, initialHpStake } = parsed.data;

  const { data: author, error: authorError } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", authorId)
    .maybeSingle();

  if (authorError || !author) {
    return { error: "Author profile was not found.", stamp: Date.now() };
  }

  const { data: post, error: postError } = await supabase
    .from("research_posts")
    .insert({
      author_id: authorId,
      title,
      body,
      sub_topic: subTopic,
      status: RESEARCH_POST_STATUS_LIVE,
      current_health: initialHpStake,
    })
    .select("id")
    .single();

  if (postError || !post) {
    return {
      error: postError?.message ?? "Failed to create research post.",
      stamp: Date.now(),
    };
  }

  const { error: txError } = await supabase.from("hp_transactions").insert({
    user_id: authorId,
    amount: initialHpStake,
    type: "stake",
    post_id: post.id,
    description: `Stake on ${subTopic} research post ${post.id}`,
  });

  if (txError) {
    return {
      error: `Post created, but HP transaction failed: ${txError.message}`,
      stamp: Date.now(),
    };
  }

  const topic = await recordSubtopicParticipation(
    supabase,
    authorId,
    subTopic,
    initialHpStake
  );

  revalidatePath("/admin");
  revalidatePath("/feed");
  revalidatePath("/ranking");
  revalidatePath("/wallet");

  if (topic.error) {
    return {
      error: `Post created, but topic rank failed: ${topic.error}`,
      stamp: Date.now(),
    };
  }

  return { message: "Research post seeded.", stamp: Date.now() };
}
