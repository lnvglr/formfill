import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { adjustUserCredits } from "@/lib/billing-admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      user_id?: string;
      delta?: number;
      reason?: string;
    };

    if (!body.user_id || body.delta === undefined) {
      return NextResponse.json(
        { error: "user_id und delta erforderlich" },
        { status: 400 }
      );
    }

    const newBalance = await adjustUserCredits(
      body.user_id,
      body.delta,
      body.reason ?? "admin_adjustment"
    );

    return NextResponse.json({ form_credits: newBalance });
  } catch (error) {
    console.error("Admin adjust credits error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
