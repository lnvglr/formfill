import { generateText, parseJsonResponse } from "@/lib/ai/provider";
import {
  buildFieldMappingPrompt,
  finalizeStructureMapping,
} from "@/lib/field-mapping";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MissingField, PdfFieldContext, PdfStructureMapping } from "@/lib/types";

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
      pdfText: string;
      pdfFieldNames: string[];
      fieldContexts?: PdfFieldContext[];
      requiredFields?: MissingField[];
      fileName?: string;
    };

    const { pdfText, pdfFieldNames, fieldContexts = [], requiredFields, fileName } =
      body;

    if (!pdfText?.trim()) {
      return NextResponse.json({ error: "PDF-Text fehlt" }, { status: 400 });
    }

    const contexts: PdfFieldContext[] =
      fieldContexts.length > 0
        ? fieldContexts
        : pdfFieldNames.map((pdf_field) => ({
            pdf_field,
            page: 0,
            nearby_label: pdf_field,
            rect: {
              name: pdf_field,
              page: 0,
              x: 0,
              y: 0,
              width: 0,
              height: 0,
            },
          }));

    const system =
      "Du ordnest PDF-Formularfelder präzise kanonischen Profil-Schlüsseln zu. Antworte NUR mit validem JSON. Du siehst KEINE Nutzerdaten. Verwende ausschließlich pdf_field-Namen aus der Feldliste. Berücksichtige Beschriftung und Formularabschnitt — nicht nur den technischen Feldnamen.";

    const prompt = buildFieldMappingPrompt({
      pdfText,
      fieldContexts: contexts,
      fileName,
      requiredFields,
    });

    const raw = await generateText([{ role: "user", content: prompt }], system);
    const parsed = parseJsonResponse<PdfStructureMapping>(raw);
    const finalized = finalizeStructureMapping(
      {
        title: parsed.title ?? fileName ?? "Antrag",
        mappings: parsed.mappings ?? [],
        signature_placement: parsed.signature_placement,
        has_form_fields: pdfFieldNames.length > 0,
      },
      contexts
    );

    return NextResponse.json(finalized);
  } catch (error) {
    console.error("Map fields error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Feldzuordnung fehlgeschlagen",
      },
      { status: 500 }
    );
  }
}
