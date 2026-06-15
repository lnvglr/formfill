import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchApplicationSummaries } from "@/lib/db/applications";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  try {
    const data = await fetchApplicationSummaries(supabase, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
