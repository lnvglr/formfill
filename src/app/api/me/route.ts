import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureSuperAdminRole, isSuperAdmin } from "@/lib/auth";
import { getBillingStatus } from "@/lib/db/billing";
import {
  defaultBillingStatus,
  guestBillingStatus,
  isGuestUser,
} from "@/lib/session";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const promoted = await ensureSuperAdminRole(user);
    const guest = isGuestUser(promoted);

    let billing = guest ? guestBillingStatus() : defaultBillingStatus();
    if (!guest) {
      try {
        billing = await getBillingStatus(supabase, promoted.id);
      } catch (error) {
        console.error("Billing status unavailable:", error);
      }
    }

    return NextResponse.json({
      id: promoted.id,
      email: promoted.email,
      is_anonymous: guest,
      is_guest: guest,
      role: isSuperAdmin(promoted) ? "super_admin" : "user",
      billing,
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
