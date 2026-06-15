import {
  getFieldOptions,
  resolveFieldOptionSetId,
  shouldUseCombobox,
} from "@/lib/field-options";
import {
  filterExcludedFormFields,
  getFieldDisplayLabel,
  isAdditionalHouseholdMemberField,
  isThirdPartySignatureField,
  normalizeProfileKey,
} from "@/lib/field-keys";
import {
  formatElterngeldScheduleSummary,
  isElterngeldScheduleField,
} from "@/lib/elterngeld-schedule";
import type { FieldType, MissingField } from "@/lib/types";

const FIELD_TYPES: FieldType[] = [
  "text",
  "textarea",
  "date",
  "phone",
  "email",
  "address",
  "name",
  "number",
  "combobox",
  "elterngeld_schedule",
];

function isApplicantContext(key: string, question: string): boolean {
  const haystack = `${key} ${question}`.toLowerCase();
  return !/wohnungsgeber|beauftragt|vermieter|eigentu[eë]mer/.test(haystack);
}

/** Local/cloud models sometimes return `label` instead of `question`. */
function coerceFieldQuestion(field: MissingField & { label?: string }): string {
  const fromQuestion = field.question?.trim();
  if (fromQuestion) return fromQuestion;
  const fromLabel = field.label?.trim();
  if (fromLabel) return fromLabel;
  return getFieldDisplayLabel(field.key);
}

function normalizeFieldQuestion(field: MissingField & { label?: string }): string {
  const canonical = normalizeProfileKey(field.key);
  const question = coerceFieldQuestion(field);
  const haystack = `${field.key} ${question}`.toLowerCase();

  if (canonical === "name" && isApplicantContext(field.key, question)) {
    if (
      /^vor-?\s*und\s*nachname$/i.test(question) ||
      /^nachname,?\s*vorname(s)?$/i.test(question) ||
      /^familienname$/i.test(question) ||
      /^name$/i.test(question)
    ) {
      return "Wie heißt du?";
    }
  }

  if (canonical === "einzugsdatum") {
    if (!question.includes("?") || /personen|\(1|1-9|1–9/.test(haystack)) {
      return "Wann bist du in die neue Wohnung eingezogen?";
    }
  }

  return question;
}

export function normalizeFieldType(
  type: string | undefined,
  key: string,
  question: string,
  options?: string[]
): FieldType {
  const inferred = inferFieldType(key, question);
  const canonical = normalizeProfileKey(key);
  const haystack = `${key} ${question}`.toLowerCase();

  if (
    canonical === "einzugsdatum" ||
    (/einzug|einzieh/.test(haystack) && /datum/.test(haystack))
  ) {
    return "date";
  }

  if (canonical === "name" && isApplicantContext(key, question)) {
    return "name";
  }

  if (isElterngeldScheduleField(key, question, type)) {
    return "elterngeld_schedule";
  }

  if (shouldUseCombobox(key, question, type, options)) {
    return "combobox";
  }

  if (type && FIELD_TYPES.includes(type as FieldType)) {
    if (
      (type === "textarea" || type === "text") &&
      (inferred === "date" || inferred === "name")
    ) {
      return inferred;
    }
    return type as FieldType;
  }
  return inferred;
}

export function inferFieldType(key: string, question: string): FieldType {
  const haystack = `${key} ${question}`.toLowerCase();
  const canonical = normalizeProfileKey(key);

  if (/datum|geburtsdatum|einzugsdatum|gueltig|gültig/.test(haystack)) {
    return "date";
  }
  if (/telefon|handy|mobil|fax|tel\./.test(haystack)) {
    return "phone";
  }
  if (/e-?mail|mailadresse/.test(haystack)) {
    return "email";
  }
  if (canonical === "postleitzahl" || canonical === "plz") {
    return "number";
  }
  if (canonical === "strasse" || canonical === "ort") {
    return "text";
  }
  if (
    /_adresse$|_anschrift$/.test(key.toLowerCase()) ||
    canonical === "wohnungsanschrift"
  ) {
    return "address";
  }
  if (/\bname\b|beauftragt|geber|eigentümer|eigentuemer/.test(haystack)) {
    return "name";
  }
  if (/nummer|anzahl|stockwerk|etage|personen/.test(haystack)) {
    return "number";
  }
  if (/bemerkung|beschreibung|grund|erlaeuterung|erläuterung/.test(haystack)) {
    return "textarea";
  }
  if (isElterngeldScheduleField(key, question)) {
    return "elterngeld_schedule";
  }

  if (resolveFieldOptionSetId(key, question)) {
    return "combobox";
  }

  return "text";
}

export function inferRequired(
  field: Pick<MissingField, "key" | "question" | "reason" | "required">
): boolean {
  if (field.required === true) return true;
  if (field.required === false) return false;
  if (field.reason === "stale") return false;

  const haystack = `${field.key} ${field.question}`.toLowerCase();
  if (
    /optional|freiwillig|falls vorhanden|sofern|zusatz|bemerkung|hinweis|ergaenz|ergänz|nicht zwingend|kann leer/.test(
      haystack
    )
  ) {
    return false;
  }

  return true;
}

export function getFieldPlaceholder(type: FieldType): string {
  switch (type) {
    case "date":
      return "TT.MM.JJJJ";
    case "phone":
      return "+49 123 456789";
    case "email":
      return "name@beispiel.de";
    case "address":
      return "Straße Hausnr., PLZ Ort";
    case "name":
      return "Vor- und Nachname";
    case "number":
      return "Zahl eingeben";
    case "combobox":
      return "Auswählen oder eingeben…";
    case "textarea":
      return "Antwort eingeben…";
    default:
      return "Antwort eingeben…";
  }
}

export function getFieldHint(type: FieldType): string | null {
  switch (type) {
    case "date":
      return "Format: TT.MM.JJJJ";
    case "phone":
      return "Mit Ländervorwahl, z. B. +49 …";
    case "combobox":
      return "Aus Liste wählen oder eigenen Wert eingeben";
    case "elterngeld_schedule":
      return "Monatsraster für Basis-Elterngeld und Elterngeld Plus";
    case "textarea":
      return "Enter für neue Zeile · Umschalt+Enter zum Weiter";
    default:
      return null;
  }
}

function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

function truncate(value: string, max = 80): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function generateSubquestion(field: MissingField): string {
  const label = getFieldDisplayLabel(field.key);
  const haystack = `${field.key} ${field.question}`.toLowerCase();

  switch (field.type) {
    case "name":
      if (/wohnungsgeber/.test(haystack)) {
        return "Vor- und Nachname der Person oder Firma, die dir die Wohnung vermietet.";
      }
      if (/beauftragt|eigene_person/.test(haystack)) {
        return "Vor- und Nachname der Person, die den Antrag stellvertretend ausfüllt.";
      }
      return `Gib den vollständigen Namen an, der im Feld „${label}“ stehen soll.`;
    case "address":
      if (/wohnungsgeber/.test(haystack)) {
        return "Anschrift des Wohnungsgebers — nicht deine eigene Wohnadresse.";
      }
      if (/beauftragt|eigene_person/.test(haystack)) {
        return "Wohn- oder Meldeadresse der beauftragten Person.";
      }
      return "Straße mit Hausnummer, Postleitzahl und Ort — genau wie im Formular.";
    case "date":
      if (/einzug/.test(haystack)) {
        return "Der Tag, an dem du die Wohnung bezogen hast.";
      }
      if (/unterschrift/.test(haystack)) {
        return "Das Datum, das neben deiner Unterschrift im Formular stehen soll.";
      }
      return "Das Datum im Format TT.MM.JJJJ, wie es im Antrag verlangt wird.";
    case "phone":
      return "Telefonnummer mit Vorwahl, unter der du erreichbar bist.";
    case "email":
      return "E-Mail-Adresse für Rückfragen zu diesem Antrag.";
    case "number":
      return "Nur die Zahl eingeben, ohne Einheit oder Zusatztext.";
    case "combobox":
      return "Wähle einen üblichen Wert aus der Liste oder tippe eine eigene Angabe ein.";
    case "elterngeld_schedule":
      return "Trage für jeden Elternteil die beantragten Lebensmonate ein — entweder die Standardoption (Monate 1–12) oder ein abweichendes Raster.";
    case "textarea":
      return "Alle Details, die in diesem Freitextfeld des Formulars stehen sollen.";
    default:
      if (/ort/.test(haystack) && !/wohnort|geburtsort/.test(haystack)) {
        return "Der Ort, an dem du das Formular unterschreibst — meist dein aktueller Wohnort.";
      }
      return `Konkrete Angabe für „${label}“, passend zum Formularfeld.`;
  }
}

function generateInfo(field: MissingField): string {
  const label = getFieldDisplayLabel(field.key);
  const haystack = `${field.key} ${field.question}`.toLowerCase();

  if (field.reason === "stale") {
    return `Formfill hat „${label}“ bereits in deinem Profil gespeichert. Da die Angabe schon länger nicht aktualisiert wurde, prüfe bitte, ob sie für diesen Antrag noch korrekt ist. Wenn sich etwas geändert hat, trage den neuen Wert ein.`;
  }

  if (/wohnungsgeber_nicht|nicht_eigentuemer|nicht_eigentümer/.test(haystack)) {
    return "Manche Formulare verlangen zusätzlich den Wohnungsgeber, wenn dieser nicht zugleich Eigentümer der Immobilie ist — z. B. bei einer Hausverwaltung oder einem Vermittler. Das ist nicht dieselbe Person wie der Eigentümer.";
  }

  if (/wohnungsgeber/.test(haystack)) {
    return "Der Wohnungsgeber ist die Person oder Organisation, von der du die Wohnung gemietet hast (z. B. Vermieter, Hausverwaltung). Die Angaben werden im Abschnitt „Wohnungsgeber“ des Formulars eingetragen.";
  }

  if (/beauftragt|eigene_person|angaben_zur_eigenen/.test(haystack)) {
    return "Hier sind Daten einer anderen Person gemeint, die den Antrag in deinem Namen stellt oder begleitet — nicht deine eigenen Angaben als einziehende Person.";
  }

  if (/einzieh/.test(haystack)) {
    return "Diese Angabe betrifft den Einzug in die neue Wohnung und wird von der Meldebehörde für die Anmeldung benötigt.";
  }

  if (/unterschrift/.test(haystack) && field.type === "date") {
    return "Das Unterschriftsdatum ist in der Regel das Datum, an dem du das Formular unterschreibst — nicht das Einzugsdatum.";
  }

  if (/unterschrift/.test(haystack) || /\bort\b/.test(haystack)) {
    return "„Ort, Datum“ bestätigt, wo und wann du das Formular unterzeichnet hast. Der Ort ist in der Regel dein aktueller Wohnort.";
  }

  const typeHints: Partial<Record<FieldType, string>> = {
    name: "Der Name sollte exakt so geschrieben sein wie im Ausweis oder Mietvertrag, damit er mit anderen Angaben im Antrag übereinstimmt.",
    address: "Die Adresse wird oft in ein Feld mit Straße, Hausnummer, PLZ und Ort übernommen. Achte auf die korrekte Schreibweise von Straßennamen.",
    date: "Verwende das Datum, das im Formular verlangt wird. Bei Unsicherheit orientiere dich am zugehörigen Abschnitt im PDF.",
    phone: "Gib eine Nummer an, unter der Behörden oder Vermieter dich bei Rückfragen erreichen können.",
    email: "Falls im Formular eine E-Mail verlangt wird, nutze eine Adresse, die du regelmäßig abrufst.",
  };

  return (
    typeHints[field.type] ??
    `Diese Frage bezieht sich auf das Formularfeld „${label}“. Die Angabe wird in deinem Profil gespeichert und kann bei künftigen Anträgen wiederverwendet werden.`
  );
}

export function enrichMissingField(
  field: MissingField & { label?: string }
): MissingField {
  const question = normalizeFieldQuestion(field);
  const options = getFieldOptions(field.key, question, field.options);
  const type = normalizeFieldType(field.type, field.key, question, options);
  const resolvedType =
    type === "text" && options.length > 0 ? "combobox" : type;
  const enriched = {
    ...field,
    question,
    type: resolvedType,
    options: options.length > 0 ? options : undefined,
  };

  return {
    ...enriched,
    required: inferRequired(enriched),
    subquestion:
      field.subquestion?.trim() ||
      generateSubquestion({ ...enriched, type: resolvedType }),
    info: field.info?.trim() || generateInfo({ ...enriched, type: resolvedType }),
  };
}

export function enrichStaleField(
  field: { key: string; value: string; updated_at: string },
  type: FieldType
): MissingField {
  const label = getFieldDisplayLabel(field.key);

  return enrichMissingField({
    key: field.key,
    question: `Ist dein ${label} noch aktuell?`,
    subquestion: `Aktuell gespeichert: „${truncate(field.value)}"`,
    info: `Zuletzt aktualisiert am ${new Date(field.updated_at).toLocaleDateString("de-DE")}. ${generateInfo({
      key: field.key,
      question: label,
      type,
      reason: "stale",
    })}`,
    type,
    required: false,
    reason: "stale",
  });
}

export function missingLabelsToFields(
  missing: string[],
  existingKeys: Set<string>
): MissingField[] {
  const fields: MissingField[] = [];
  const seen = new Set<string>();

  for (const label of missing) {
    if (isThirdPartySignatureField(label, label)) continue;
    if (isAdditionalHouseholdMemberField(label, label)) continue;
    let key = slugifyLabel(label);
    if (!key) continue;

    let suffix = 1;
    while (existingKeys.has(key) || seen.has(key)) {
      key = `${slugifyLabel(label)}_${suffix}`;
      suffix += 1;
    }

    seen.add(key);
    const question = label.includes("?")
      ? label
      : `Was ist ${label}?`;

    fields.push(
      enrichMissingField({
        key: normalizeProfileKey(key),
        question,
        type: inferFieldType(key, label),
        reason: "missing",
      })
    );
  }

  return fields;
}

export function normalizeMissingFields(
  fields: MissingField[]
): MissingField[] {
  return filterExcludedFormFields(
    fields.map((field) => enrichMissingField(field))
  );
}

export function formatProfileValue(type: FieldType, value: string): string {
  if (type === "elterngeld_schedule") {
    return formatElterngeldScheduleSummary(value);
  }

  if (type !== "date") return value;

  const trimmed = value.trim();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");
    return `${day.padStart(2, "0")}.${month.padStart(2, "0")}.${year}`;
  }

  return trimmed;
}
