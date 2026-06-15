import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

/** Ensures a browser auth session exists, creating an anonymous guest session if needed. */
export async function ensureClientAuthSession(): Promise<Session | null> {
  const supabase = createClient();
  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) return session;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) return null;

  ({
    data: { session },
  } = await supabase.auth.getSession());
  return session;
}
