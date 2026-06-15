import type { User } from "@supabase/supabase-js";
import type { BillingStatus } from "@/lib/db/billing";
import { FREE_MONTHLY_CREDITS } from "@/lib/stripe";

export function isGuestUser(user: User | null | undefined): boolean {
  return Boolean(user?.is_anonymous);
}

export function defaultBillingStatus(): BillingStatus {
  return {
    form_credits: 0,
    free_credits_remaining: FREE_MONTHLY_CREDITS,
    subscription_tier: "free",
    subscription_status: null,
    subscription_period_end: null,
    is_pro: false,
    can_download_unlimited: false,
  };
}

export function guestBillingStatus(): BillingStatus {
  return defaultBillingStatus();
}
