import { createClient } from "@supabase/supabase-js";
import { optionalEnv, requiredEnv } from "@/lib/env";

export function createAdminClient() {
  return createClient(
    optionalEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
