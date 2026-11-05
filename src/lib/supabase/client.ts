import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { publicEnv } from "@/lib/env";

/** Supabase client for Client Components. Uses the signed-in user's session; RLS applies. */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseKey,
  );
}
