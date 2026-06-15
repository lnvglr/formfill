import {
  isAdditionalHouseholdMemberField,
  isExcludedPdfMapping,
  isThirdPartySignatureField,
  normalizeProfileKey,
} from "@/lib/field-keys";
import { parseRepeatableFieldKey } from "@/lib/repeatable-fields";
import { isElterngeldPdfFieldName, isElterngeldScheduleField } from "@/lib/elterngeld-schedule";
import type {
  FieldRole,
  MissingField,
  PdfFieldContext,
  PdfFieldMappingSpec,
  PdfStructureMapping,
} from "@/lib/types";

export function inferMappingRole(
  mapping: Pick<PdfFieldMappingSpec, "pdf_field" | "label" | "context" | "profile_key">
): FieldRole {
  const haystack =
    `${mapping.pdf_field} ${mapping.label} ${mapping.context ?? ""} ${mapping.profile_key}`.toLowerCase();

  if (/wohnungsgeber|vermieter|hausverwaltung/.test(haystack) && !/einzieh/.test(haystack)) {
    return "landlord";
  }
  if (/beauftragt|eigene.?person|vertret/.test(haystack)) {
    return "representative";
  }
  if (/person\s*[2-9]|personen\s*\(?\s*[2-9]|mitglied_[2-9]/.test(haystack)) {
    return "household";
  }
  if (/unterschrift/.test(haystack) && /ort|datum|tag/.test(haystack)) {
    return "signature_meta";
  }
  if (/einzieh|antragsteller|person\s*1\b|personen\s*\(?\s*1/.test(haystack)) {
    return "applicant";
  }

  return "applicant";
}

export function inferQuestionRole(field: MissingField): FieldRole {
  const haystack = `${field.key} ${field.question} ${field.subquestion ?? ""}`.toLowerCase();

  if (/wohnungsgeber|vermieter/.test(haystack)) return "landlord";
  if (/beauftragt|eigene.?person|vertret/.test(haystack)) return "representative";

  const repeatable = parseRepeatableFieldKey(field.key);
  if (repeatable && repeatable.index >= 2) return "household";

  if (/unterschrift/.test(haystack)) return "signature_meta";
  return "applicant";
}

function roleMatches(
  mappingRole: FieldRole,
  questionRole: FieldRole,
  field: MissingField,
  mapping: PdfFieldMappingSpec
): boolean {
  if (mappingRole === "other") return false;
  if (mappingRole === questionRole) return true;

  const repeatable = parseRepeatableFieldKey(field.key);
  if (repeatable && mappingRole === "household") {
    const mappingRepeatable = parseRepeatableFieldKey(mapping.profile_key);
    return mappingRepeatable?.index === repeatable.index;
  }

  if (questionRole === "signature_meta" && mappingRole === "signature_meta") {
    return true;
  }

  return false;
}

function profileKeysMatch(field: MissingField, mapping: PdfFieldMappingSpec): boolean {
  if (mapping.profile_key === field.key) return true;

  const fieldCanonical = normalizeProfileKey(field.key);
  const mappingCanonical = normalizeProfileKey(mapping.profile_key);
  if (fieldCanonical !== mappingCanonical) return false;

  const fieldRepeatable = parseRepeatableFieldKey(field.key);
  const mappingRepeatable = parseRepeatableFieldKey(mapping.profile_key);
  if (fieldRepeatable || mappingRepeatable) {
    return (
      fieldRepeatable?.index === mappingRepeatable?.index &&
      fieldRepeatable?.fieldKey === mappingRepeatable?.fieldKey
    );
  }

  return true;
}

export function enrichMapping(
  mapping: PdfFieldMappingSpec,
  context?: PdfFieldContext
): PdfFieldMappingSpec {
  return {
    ...mapping,
    label: mapping.label?.trim() || context?.nearby_label || mapping.pdf_field,
    context: mapping.context?.trim() || context?.nearby_label,
    role: mapping.role ?? inferMappingRole({
      ...mapping,
      context: mapping.context ?? context?.nearby_label,
    }),
  };
}

export function validateMappings(
  mappings: PdfFieldMappingSpec[],
  contexts: PdfFieldContext[]
): PdfFieldMappingSpec[] {
  const knownFields = new Set(contexts.map((context) => context.pdf_field));
  const contextByField = new Map(
    contexts.map((context) => [context.pdf_field, context])
  );
  const usedPdfFields = new Set<string>();
  const result: PdfFieldMappingSpec[] = [];

  for (const raw of mappings) {
    if (!raw.pdf_field?.trim() || !raw.profile_key?.trim()) continue;
    if (isExcludedPdfMapping(raw)) continue;
    if (isThirdPartySignatureField(raw.profile_key, raw.label)) continue;
    if (isAdditionalHouseholdMemberField(raw.profile_key, raw.label)) continue;
    if (contexts.length > 0 && !knownFields.has(raw.pdf_field)) continue;
    if (usedPdfFields.has(raw.pdf_field)) continue;

    usedPdfFields.add(raw.pdf_field);
    result.push(enrichMapping(raw, contextByField.get(raw.pdf_field)));
  }

  return result;
}

export function attachPdfFieldsToQuestions(
  questions: MissingField[],
  mappings: PdfFieldMappingSpec[],
  allPdfFieldNames: string[] = []
): MissingField[] {
  const elterngeldPdfFields = [
    ...new Set(
      [...mappings.map((mapping) => mapping.pdf_field), ...allPdfFieldNames].filter(
        (name) => isElterngeldPdfFieldName(name)
      )
    ),
  ];

  return questions.map((field) => {
    const questionRole = inferQuestionRole(field);
    const pdf_fields = [
      ...new Set(
        mappings
          .filter((mapping) => {
            if (!profileKeysMatch(field, mapping)) return false;
            const mappingRole = mapping.role ?? inferMappingRole(mapping);
            return roleMatches(mappingRole, questionRole, field, mapping);
          })
          .map((mapping) => mapping.pdf_field)
      ),
    ];

    if (isElterngeldScheduleField(field.key, field.question, field.type)) {
      return {
        ...field,
        pdf_fields: [...new Set([...pdf_fields, ...elterngeldPdfFields])],
      };
    }

    return pdf_fields.length > 0 ? { ...field, pdf_fields } : field;
  });
}

export function buildFieldMappingPrompt(options: {
  pdfText: string;
  fieldContexts: PdfFieldContext[];
  fileName?: string;
  requiredFields?: MissingField[];
}): string {
  const { pdfText, fieldContexts, fileName, requiredFields } = options;

  const contextLines =
    fieldContexts.length > 0
      ? fieldContexts
          .map((context, index) => {
            return `${index + 1}. pdf_field: "${context.pdf_field}" | Seite ${context.page + 1} | Beschriftung: "${context.nearby_label}"`;
          })
          .join("\n")
      : "Keine AcroForm-Felder gefunden.";

  const requiredHint =
    requiredFields && requiredFields.length > 0
      ? `\nZu erfassende Profilfelder (Fragebogen):\n${requiredFields
          .map(
            (field) =>
              `- ${field.key}: ${field.question}${field.subquestion ? ` (${field.subquestion})` : ""}`
          )
          .join("\n")}\n`
      : "";

  return `Formular: ${fileName ?? "Antrag"}

Formularauszug:
---
${pdfText.slice(0, 5500)}
---

AcroForm-Felder mit Beschriftung im PDF (verwende NUR diese exakten pdf_field-Namen):
${contextLines}
${requiredHint}
Ordne jedes relevante PDF-Feld genau einem profile_key zu. Nutze Beschriftung + Abschnitt im Formulartext — nicht nur den technischen Feldnamen.

Rollen (role):
- applicant = einziehende Person / Antragsteller / Person 1
- landlord = Wohnungsgeber / Vermieter / Hausverwaltung
- representative = beauftragte Person / Vertretung
- household = weitere Personen (Person 2–9) — profile_key z. B. person_2_name
- signature_meta = Ort/Datum der Unterschrift des Antragstellers
- other = nicht zuordnen (Feld weglassen)

Wichtige Regeln:
- Person 1 / Antragsteller: name, strasse, postleitzahl, ort, geburtsdatum, geburtsort, einzugsdatum, telefon, email
- Wohnungsgeber-Abschnitt: wohnungsgeber_name, wohnungsgeber_strasse, wohnungsgeber_postleitzahl, wohnungsgeber_ort (role landlord)
- NICHT befüllen: Unterschrift des Wohnungsgebers/Beauftragten (handschriftlich)
- NICHT Person 2–9 befüllen, außer explizit als household mit person_N_* keys
- Elterngeld Bezugszeitraum / Lebensmonate (Abschnitt 1.3): NICHT einzeln zuordnen — alle Checkbox-Felder für Monatsraster bleiben ohne profile_key (werden aus elterngeld_bezugszeitraum abgeleitet)
- Vorname und Nachname des Antragstellers → beide auf profile_key "name" nur wenn es zwei separate PDF-Felder für dieselbe Person sind; label jeweils präzise
- PLZ/Ort/Straße des Antragstellers ≠ Wohnungsgeber-Adresse

Kanonische profile_keys:
name, strasse, postleitzahl, ort, geburtsdatum, geburtsort, einzugsdatum,
telefon, email, wohnungsgeber_name, wohnungsgeber_strasse, wohnungsgeber_postleitzahl, wohnungsgeber_ort,
beauftragter_name, beauftragter_strasse, beauftragter_postleitzahl, beauftragter_ort,
unterschrift_ort, unterschrift_datum, person_2_name, person_2_geburtsdatum, person_2_geburtsort, …

Antworte mit JSON:
{
  "title": "Titel des Antrags",
  "mappings": [
    {
      "pdf_field": "exakter Name aus der Liste",
      "profile_key": "name",
      "label": "Lesbare Feldbezeichnung aus dem Formular",
      "role": "applicant",
      "context": "Kurz: Abschnitt im Formular"
    }
  ],
  "signature_placement": { "page": -1, "x": 72, "y": 72, "width": 180, "height": 60 }
}`;
}

export function finalizeStructureMapping(
  mapping: PdfStructureMapping,
  contexts: PdfFieldContext[]
): PdfStructureMapping {
  return {
    ...mapping,
    mappings: validateMappings(mapping.mappings ?? [], contexts),
  };
}
