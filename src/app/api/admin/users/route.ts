import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
      await admin.auth.admin.listUsers({ perPage: 200 });

    if (authError) {
      throw new Error(authError.message);
    }

    const userIds = authData.users.map((u) => u.id);

    const { data: billingAccounts, error: billingError } = await admin
      .from("billing_accounts")
      .select("*")
      .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    if (billingError) {
      throw new Error(billingError.message);
    }

    const billingByUser = new Map(
      (billingAccounts ?? []).map((account) => [account.user_id, account])
    );

    const users = authData.users.map((authUser) => {
      const billing = billingByUser.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        role:
          authUser.app_metadata?.role === "super_admin"
            ? "super_admin"
            : "user",
        form_credits: billing?.form_credits ?? 0,
        subscription_tier: billing?.subscription_tier ?? "free",
        subscription_status: billing?.subscription_status ?? null,
        stripe_customer_id: billing?.stripe_customer_id ?? null,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
