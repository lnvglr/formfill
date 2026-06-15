import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Prefer `SUPABASE_SECRET_KEY` (sb_secret_…); legacy `SUPABASE_SERVICE_ROLE_KEY` still works. */
export function getSupabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function hasSupabaseSecretKey(): boolean {
  return Boolean(getSupabaseSecretKey());
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseSecretKey();

  if (!url || !key) {
    throw new Error(
      "Supabase secret key is not configured (set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
