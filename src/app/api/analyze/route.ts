import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findFormDocumentByHash } from "@/lib/db/form-documents";
import { normalizeMissingFields } from "@/lib/field-types";
import {
  inferRepeatableGroupsFromText,
  normalizeRepeatableGroups,
} from "@/lib/repeatable-fields";
import { generateText, parseJsonResponse } from "@/lib/ai/provider";
import type { AnalyzeResponse, MissingField, RepeatableGroup } from "@/lib/types";

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
      fileHash?: string;
    };
    const { pdfText, fileHash } = body;

    if (!pdfText?.trim()) {
      return NextResponse.json(
        { error: "PDF-Text fehlt" },
        { status: 400 }
      );
    }

    const system =
      "Du bist ein Experte für deutsche Formulare. Antworte NUR mit validem JSON. Du siehst KEINE Nutzerdaten und darfst KEINE Werte erfinden.";

    const prompt = `Formularauszug:

---
${pdfText.slice(0, 6000)}
---

Identifiziere alle Felder, die dieser Antrag benötigt. Gib nur Feld-Schlüssel und Fragen zurück — KEINE Werte, KEINE Annahmen über bereits bekannte Daten.

Regeln:
- Antragsteller (Person 1): key **name**, question „Wie heißt du?“, type name. NIEMALS vorname/nachname oder „Vor- und Nachname“ als Frage.
- Eigene Adresse: strasse (Straße+Hausnummer), postleitzahl, ort — NIEMALS hausnummer separat.
- Wohnungsgeber: wohnungsgeber_name, wohnungsgeber_adresse (type address).
- Einzugsdatum: key einzugsdatum, type date, question „Wann bist du eingezogen?“ — ein Datum, kein Freitext für Personentabellen.
- Unterschrift Antragsteller: unterschrift_ort, unterschrift_datum.
- NICHT abfragen: Unterschrift des Wohnungsgebers oder Beauftragten — bleibt leer zum handschriftlichen Unterschreiben.
- Weitere Personen (Plätze 2–9): NICHT als einzelne required_fields — stattdessen repeatable_groups (siehe unten).
- Auswahlfelder mit Freitext: type combobox, key z. B. familienstand, geschlecht, religion, staatsangehoerigkeit — optional mit options-Array für Formular-spezifische Werte.
- Elterngeld Bezugszeitraum (Abschnitt 1.3 o.ä.): EIN Feld key **elterngeld_bezugszeitraum**, type **elterngeld_schedule**, question z. B. „Für welche Lebensmonate beantragst du Elterngeld?“ — NICHT einzelne Monatsfelder.

Erlaubte types: name, address, date, phone, email, number, textarea, text, combobox, elterngeld_schedule

JSON:
{
  "form_title": "Titel",
  "required_fields": [
    {
      "key": "name",
      "question": "Wie heißt du?",
      "type": "name",
      "required": true
    }
  ],
  "repeatable_groups": [
    {
      "id": "person",
      "question": "Weitere Personen im Haushalt",
      "subquestion": "Optional — weitere einziehende Personen (Plätze 2–9)",
      "maxInstances": 8,
      "startIndex": 2,
      "required": false,
      "fields": [
        { "key": "name", "label": "Name", "type": "name" },
        { "key": "geburtsdatum", "label": "Geburtsdatum", "type": "date" },
        { "key": "geburtsort", "label": "Geburtsort", "type": "text" }
      ]
    }
  ]
}

repeatable_groups nur wenn das Formular eine Personentabelle (1–9) hat, sonst leeres Array [].`;

    const raw = await generateText([{ role: "user", content: prompt }], system);
    const parsed = parseJsonResponse<{
      form_title?: string;
      required_fields?: MissingField[];
      missing_fields?: MissingField[];
      repeatable_groups?: RepeatableGroup[];
    }>(raw);

    let matchedDocument: AnalyzeResponse["matched_document"];
    if (fileHash) {
      const matched = await findFormDocumentByHash(supabase, fileHash);
      if (matched) {
        matchedDocument = {
          id: matched.id,
          title: matched.title,
          family_title: matched.family_title,
          family_slug: matched.family_slug,
          jurisdiction_code: matched.jurisdiction_code,
          version_label: matched.version_label,
          official_id: matched.official_id,
        };
      }
    }

    const required_fields = normalizeMissingFields(
      (parsed.required_fields ?? parsed.missing_fields ?? []).map((field) => ({
        ...field,
        reason: "missing" as const,
      }))
    );

    const repeatable_groups = normalizeRepeatableGroups(
      parsed.repeatable_groups?.length
        ? parsed.repeatable_groups
        : inferRepeatableGroupsFromText(pdfText)
    );

    return NextResponse.json({
      form_title: matchedDocument?.title ?? parsed.form_title ?? "Unbekannter Antrag",
      required_fields,
      repeatable_groups,
      matched_document: matchedDocument,
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "KI-Analyse fehlgeschlagen",
      },
      { status: 500 }
    );
  }
}
