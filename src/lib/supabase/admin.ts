import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

function getServiceRoleKey(): string {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin operations but was not provided."
    );
  }
  return env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Supabase Admin Client using Service Role Key.
 * MUST NEVER be exposed or used in client-side code!
 */
export function createSupabaseAdminClient() {
  const serviceKey = getServiceRoleKey();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
