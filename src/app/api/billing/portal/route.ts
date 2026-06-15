import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { ensureBillingAccount } from "@/lib/db/billing";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const account = await ensureBillingAccount(supabase, user.id);

    if (!account.stripe_customer_id) {
      return NextResponse.json(
        { error: "Kein Stripe-Kunde vorhanden" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${origin}/?view=settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Portal fehlgeschlagen" },
      { status: 500 }
    );
  }
}
