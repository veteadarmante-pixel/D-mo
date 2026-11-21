import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv, supabasePublicEnv } from "@/lib/env";

/**
 * Client « service role » : contourne la RLS.
 * Réservé aux tâches planifiées (crons) — ne jamais l'utiliser dans une page.
 */
export function createAdminClient() {
  const { url } = supabasePublicEnv();
  return createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
