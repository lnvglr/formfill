import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchFamilyVariants,
  fetchFormDocumentCatalog,
} from "@/lib/db/form-documents";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get("family_id") ?? undefined;
    const jurisdictionCode = searchParams.get("jurisdiction") ?? undefined;

    if (familyId) {
      const variants = await fetchFamilyVariants(supabase, familyId);
      return NextResponse.json({ data: variants });
    }

    const catalog = await fetchFormDocumentCatalog(supabase, {
      familyId,
      jurisdictionCode,
      limit: 100,
    });

    return NextResponse.json({ data: catalog });
  } catch (error) {
    console.error("Documents catalog error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Katalog konnte nicht geladen werden",
      },
      { status: 500 }
    );
  }
}
