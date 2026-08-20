import { databaseConfigured, db } from "@/lib/db";

type AutomationPauseSetting = {
  paused: boolean;
  reason: string | null;
};

function isPauseSetting(value: unknown): value is AutomationPauseSetting {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.paused === "boolean" && (typeof record.reason === "string" || record.reason === null);
}

export async function getAutomationGlobalPause(): Promise<AutomationPauseSetting> {
  if (process.env.AUTOMATION_GLOBAL_PAUSED === "true") {
    return { paused: true, reason: "env_global_pause" };
  }

  if (!databaseConfigured()) {
    return { paused: false, reason: null };
  }

  const sql = db();
  const rows = await sql`select value from system_settings where key = 'automation_global_paused' limit 1`;
  const value = rows[0]?.value;

  return isPauseSetting(value) ? value : { paused: false, reason: null };
}
