import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: authData, error: authError } =
      await admin.auth.admin.listUsers({ perPage: 1 });

    if (authError) {
      throw new Error(authError.message);
    }

    const [{ data: billingAccounts }, payments] = await Promise.all([
      admin.from("billing_accounts").select("subscription_tier, subscription_status, form_credits"),
      getRecentPayments(),
    ]);

    const proCount =
      billingAccounts?.filter(
        (a) =>
          a.subscription_tier === "pro" && a.subscription_status === "active"
      ).length ?? 0;

    const totalCredits =
      billingAccounts?.reduce((sum, a) => sum + (a.form_credits ?? 0), 0) ?? 0;

    return NextResponse.json({
      users: authData?.total ?? authData?.users?.length ?? 0,
      active_pro_subscriptions: proCount,
      total_credits_outstanding: totalCredits,
      recent_payments: payments,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}

async function getRecentPayments() {
  try {
    const stripe = getStripe();
    const charges = await stripe.charges.list({ limit: 10 });
    return charges.data.map((charge) => ({
      id: charge.id,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      created: charge.created,
      email: charge.billing_details.email,
      description: charge.description,
    }));
  } catch {
    return [];
  }
}
