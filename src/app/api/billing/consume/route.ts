import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = (await request.json()) as { application_id?: string };
    const applicationId = body.application_id;

    if (!applicationId) {
      return NextResponse.json(
        { error: "application_id fehlt" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("consume_download_credit", {
      p_user_id: user.id,
      p_application_id: applicationId,
    });

    if (error) {
      throw new Error(error.message);
    }

    const result = data as {
      granted: boolean;
      charged?: boolean;
      reason?: string;
      credits_remaining?: number;
    };

    if (!result.granted) {
      return NextResponse.json(
        {
          granted: false,
          reason: result.reason ?? "no_credits",
        },
        { status: 402 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Consume credit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
