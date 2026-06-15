import { createAdminClient } from "@/lib/supabase/admin";
import { CREDIT_PACK_AMOUNT } from "@/lib/stripe";

export async function addCreditsFromPurchase(
  userId: string,
  credits: number,
  stripeEventId: string,
  reason = "purchase"
) {
  const admin = createAdminClient();

  const { data: account, error: fetchError } = await admin
    .from("billing_accounts")
    .select("form_credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const currentCredits = account?.form_credits ?? 0;
  const newBalance = currentCredits + credits;

  const { error: upsertError } = await admin.from("billing_accounts").upsert(
    {
      user_id: userId,
      form_credits: newBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const { error: ledgerError } = await admin.from("credit_ledger").insert({
    user_id: userId,
    delta: credits,
    balance_after: newBalance,
    reason,
    stripe_event_id: stripeEventId,
  });

  if (ledgerError) {
    throw new Error(ledgerError.message);
  }
}

export async function addCreditPackPurchase(
  userId: string,
  stripeEventId: string
) {
  await addCreditsFromPurchase(
    userId,
    CREDIT_PACK_AMOUNT,
    stripeEventId,
    "credit_pack_purchase"
  );
}

export async function setSubscriptionState(
  userId: string,
  params: {
    tier: "free" | "pro";
    status: string | null;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
    periodEnd?: string | null;
  }
) {
  const admin = createAdminClient();

  const { error } = await admin.from("billing_accounts").upsert(
    {
      user_id: userId,
      subscription_tier: params.tier,
      subscription_status: params.status,
      stripe_subscription_id: params.stripeSubscriptionId ?? null,
      stripe_customer_id: params.stripeCustomerId ?? undefined,
      subscription_period_end: params.periodEnd ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string
) {
  const admin = createAdminClient();

  const { error } = await admin.from("billing_accounts").upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function adjustUserCredits(
  userId: string,
  delta: number,
  reason: string
) {
  const admin = createAdminClient();

  const { data: account, error: fetchError } = await admin
    .from("billing_accounts")
    .select("form_credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const currentCredits = account?.form_credits ?? 0;
  const newBalance = Math.max(0, currentCredits + delta);

  const { error: upsertError } = await admin.from("billing_accounts").upsert(
    {
      user_id: userId,
      form_credits: newBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const { error: ledgerError } = await admin.from("credit_ledger").insert({
    user_id: userId,
    delta,
    balance_after: newBalance,
    reason,
  });

  if (ledgerError) {
    throw new Error(ledgerError.message);
  }

  return newBalance;
}
