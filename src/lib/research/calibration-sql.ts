import { readFileSync } from "node:fs";
import { join } from "node:path";

export const CALIBRATION_HP_RESET_SQL_PATH =
  "supabase/migrations/20260818021000_calibration_hp_reset.sql";

export function calibrationHpResetSql() {
  return readFileSync(
    join(process.cwd(), CALIBRATION_HP_RESET_SQL_PATH),
    "utf8"
  );
}
