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
    const { data, error } = await admin
      .from("credit_ledger")
      .select("id, user_id, delta, balance_after, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ entries: data ?? [] });
  } catch (error) {
    console.error("Admin ledger error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
