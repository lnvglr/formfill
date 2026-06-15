import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchApplicationWithPaths } from "@/lib/db/applications";
import { downloadUserPdf } from "@/lib/storage/documents";

/** Returns client-encrypted PDF ciphertext for browser-side decryption. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind") === "source" ? "source" : "filled";

    const application = await fetchApplicationWithPaths(
      supabase,
      user.id,
      id
    );

    if (!application) {
      return NextResponse.json(
        { error: "Antrag nicht gefunden" },
        { status: 404 }
      );
    }

    const path =
      kind === "source"
        ? application.source_pdf_path
        : application.filled_pdf_path;

    if (!path) {
      return NextResponse.json(
        { error: "PDF nicht verfügbar" },
        { status: 404 }
      );
    }

    const encryptedBytes = await downloadUserPdf(supabase, path);

    if (!encryptedBytes) {
      return NextResponse.json(
        { error: "PDF konnte nicht geladen werden" },
        { status: 500 }
      );
    }

    const encrypted = new TextDecoder().decode(encryptedBytes);

    return NextResponse.json({ encrypted, kind });
  } catch (error) {
    console.error("Application PDF error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Download fehlgeschlagen",
      },
      { status: 500 }
    );
  }
}
