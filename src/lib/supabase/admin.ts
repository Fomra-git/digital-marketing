import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { publicEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES Row Level Security.
 *
 * Only for the few operations Supabase reserves for privileged keys
 * (e.g. sending invitations through the Auth admin API). Callers must check
 * the acting user's permission first with the user-scoped client.
 * Never import this module from client code ("server-only" enforces it).
 */
export function getServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createAdminClient() {
  const key = getServiceRoleKey();
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not configured on the server.",
    );
  }
  return createClient<Database>(publicEnv.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
