import { createAdminClient } from "@/lib/supabase/admin";

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

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "automation_global_paused")
    .maybeSingle();

  return isPauseSetting(data?.value) ? data.value : { paused: false, reason: null };
}
