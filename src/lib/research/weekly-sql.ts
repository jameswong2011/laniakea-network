import { readFileSync } from "node:fs";
import { join } from "node:path";

export const WEEKLY_MAINTENANCE_SQL_PATH =
  "supabase/migrations/20260817190000_weekly_maintenance.sql";

export function weeklyMaintenanceSql() {
  return readFileSync(
    join(process.cwd(), WEEKLY_MAINTENANCE_SQL_PATH),
    "utf8"
  );
}
