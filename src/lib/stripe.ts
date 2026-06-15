import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }

  return stripeClient;
}

export const FREE_MONTHLY_CREDITS = 2;
export const CREDIT_PACK_AMOUNT = 10;

export type CheckoutPlan = "credits" | "pro";

export function getPriceId(plan: CheckoutPlan): string {
  if (plan === "pro") {
    const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
    if (!priceId) throw new Error("STRIPE_PRICE_PRO_MONTHLY is not configured");
    return priceId;
  }

  const priceId = process.env.STRIPE_PRICE_CREDITS_10;
  if (!priceId) throw new Error("STRIPE_PRICE_CREDITS_10 is not configured");
  return priceId;
}
