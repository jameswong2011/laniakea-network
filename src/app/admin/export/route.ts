import { invitesCsv, loadAdminMetrics, usersCsv } from "@/lib/admin/metrics";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(request: Request) {
  const { supabase } = await requireAdmin();
  const kind = new URL(request.url).searchParams.get("kind");
  const metrics = await loadAdminMetrics(supabase);
  const invites = kind === "invites";
  const body = invites ? invitesCsv(metrics.tree) : usersCsv(metrics.people);
  const name = invites ? "invite-tree.csv" : "users.csv";

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
