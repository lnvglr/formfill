import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveApplication } from "@/lib/db/applications";
import type { FillResponse } from "@/lib/types";

/** Persists application metadata and client-encrypted PDFs — no PII, no AI. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      result: FillResponse;
      fileName?: string;
      sourcePdfEncrypted?: string;
      filledPdfEncrypted?: string;
      sourceFileHash?: string;
    };

    const {
      result,
      fileName,
      sourcePdfEncrypted,
      filledPdfEncrypted,
      sourceFileHash,
    } = body;

    if (!result?.title) {
      return NextResponse.json({ error: "Ergebnis fehlt" }, { status: 400 });
    }

    let sourcePdfBytes: Uint8Array | undefined;
    let filledPdfBytes: Uint8Array | undefined;

    if (sourcePdfEncrypted) {
      sourcePdfBytes = new TextEncoder().encode(sourcePdfEncrypted);
    }

    if (filledPdfEncrypted) {
      filledPdfBytes = new TextEncoder().encode(filledPdfEncrypted);
    }

    const applicationId = await saveApplication(supabase, user.id, result, {
      fileName,
      sourcePdfBytes,
      filledPdfBytes,
      sourceFileHash,
    });

    if (applicationId) {
      result.application_id = applicationId;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Save application error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Speichern fehlgeschlagen",
      },
      { status: 500 }
    );
  }
}
