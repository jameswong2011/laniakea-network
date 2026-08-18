import { redirect } from "next/navigation";
import { normalizeInviteCode } from "@/lib/research/referral";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const raw = (await searchParams).code;
  const code = typeof raw === "string" ? normalizeInviteCode(raw) : "";

  redirect(code ? `/signup?code=${encodeURIComponent(code)}` : "/signup");
}
