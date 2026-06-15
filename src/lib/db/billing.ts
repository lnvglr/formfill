import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { FREE_MONTHLY_CREDITS } from "@/lib/stripe";

type DbClient = SupabaseClient<Database>;

export type BillingAccount = {
  user_id: string;
  stripe_customer_id: string | null;
  form_credits: number;
  free_credits_used: number;
  billing_period_start: string;
  subscription_tier: "free" | "pro";
  subscription_status: string | null;
  stripe_subscription_id: string | null;
  subscription_period_end: string | null;
};

export type BillingStatus = {
  form_credits: number;
  free_credits_remaining: number;
  subscription_tier: "free" | "pro";
  subscription_status: string | null;
  subscription_period_end: string | null;
  is_pro: boolean;
  can_download_unlimited: boolean;
};

export async function ensureBillingAccount(
  supabase: DbClient,
  userId: string
): Promise<BillingAccount> {
  const { data, error } = await supabase.rpc("reset_billing_period_if_needed", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as BillingAccount;
}

export function toBillingStatus(account: BillingAccount): BillingStatus {
  const isPro =
    account.subscription_tier === "pro" &&
    account.subscription_status === "active";

  return {
    form_credits: account.form_credits,
    free_credits_remaining: Math.max(
      0,
      FREE_MONTHLY_CREDITS - account.free_credits_used
    ),
    subscription_tier: account.subscription_tier,
    subscription_status: account.subscription_status,
    subscription_period_end: account.subscription_period_end,
    is_pro: isPro,
    can_download_unlimited: isPro,
  };
}

export async function getBillingStatus(
  supabase: DbClient,
  userId: string
): Promise<BillingStatus> {
  const account = await ensureBillingAccount(supabase, userId);
  return toBillingStatus(account);
}

export async function hasDownloadGrant(
  supabase: DbClient,
  userId: string,
  applicationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("download_grants")
    .select("id")
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
