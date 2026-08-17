import { invokeWeeklyMaintenance, weeklyMaintenanceMessage } from "@/lib/research/weekly";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (secret) {
    return header === `Bearer ${secret}`;
  }

  return process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();

  if (!supabase) {
    return Response.json(
      {
        error:
          "Missing SUPABASE_SERVICE_ROLE_KEY. Run the weekly SQL so pg_cron can execute the job in the database.",
      },
      { status: 500 }
    );
  }

  const result = await invokeWeeklyMaintenance(supabase, "cron");

  if (result.error) {
    return Response.json(
      { ...result, error: weeklyMaintenanceMessage(result) },
      { status: 500 }
    );
  }

  return Response.json({
    message: weeklyMaintenanceMessage(result),
    ...result,
  });
}
