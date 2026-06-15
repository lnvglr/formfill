import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBillingStatus } from "@/lib/db/billing";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const billing = await getBillingStatus(supabase, user.id);
    return NextResponse.json(billing);
  } catch (error) {
    console.error("Billing status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
