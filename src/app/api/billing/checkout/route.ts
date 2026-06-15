import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getPriceId, type CheckoutPlan } from "@/lib/stripe";
import { setStripeCustomerId } from "@/lib/billing-admin";
import { ensureBillingAccount } from "@/lib/db/billing";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = (await request.json()) as { plan?: CheckoutPlan };
    const plan = body.plan ?? "credits";

    if (plan !== "credits" && plan !== "pro") {
      return NextResponse.json({ error: "Ungültiger Plan" }, { status: 400 });
    }

    const account = await ensureBillingAccount(supabase, user.id);
    const stripe = getStripe();
    const origin = new URL(request.url).origin;

    let customerId = account.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await setStripeCustomerId(user.id, customerId);
    }

    const priceId = getPriceId(plan);
    const mode = plan === "pro" ? "subscription" : "payment";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data:
        plan === "pro"
          ? {
              metadata: {
                supabase_user_id: user.id,
                plan: "pro",
              },
            }
          : undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout fehlgeschlagen" },
      { status: 500 }
    );
  }
}
