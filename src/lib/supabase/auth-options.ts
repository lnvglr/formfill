/** Shared Supabase Auth options (passkeys are experimental in supabase-js). */
export const supabaseAuthOptions = {
  auth: {
    experimental: { passkey: true },
  },
} as const;
