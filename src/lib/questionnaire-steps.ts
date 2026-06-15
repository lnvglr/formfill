import { getAddressKeyPrefix } from "@/lib/field-autocomplete";
import {
  filterExcludedFormFields,
  getFieldDisplayLabel,
  normalizeProfileKey,
} from "@/lib/field-keys";
import { isValidFieldValue } from "@/lib/field-masks";
import { isElterngeldScheduleField } from "@/lib/elterngeld-schedule";
import { isElterngeldScheduleAnswered } from "@/lib/elterngeld-schedule";
import {
  isRepeatableFieldKey,
  getRepeatableGroupAnswerKeys,
} from "@/lib/repeatable-fields";
import type { MissingField, RepeatableGroup } from "@/lib/types";

export type QuestionnaireStep = {
  id: string;
  question: string;
  subquestion?: string;
  info?: string;
  required?: boolean;
  reason?: "missing" | "stale";
  layout: "single" | "address" | "fields" | "repeat" | "elterngeld_schedule";
  fields: MissingField[];
  addressKey?: string;
  repeatGroup?: RepeatableGroup;
};

const STATIC_GROUPS: {
  id: string;
  keys: string[];
  question: string;
  subquestion: string;
}[] = [
  {
    id: "birth",
    keys: ["geburtsdatum", "geburtsort"],
    question: "Geburtsangaben",
    subquestion: "Geburtsdatum und Geburtsort wie im Ausweis.",
  },
  {
    id: "contact",
    keys: ["telefon", "email"],
    question: "Kontaktdaten",
    subquestion: "Telefon und E-Mail für Rückfragen zu diesem Antrag.",
  },
  {
    id: "signature_meta",
    keys: ["unterschrift_ort", "unterschrift_datum"],
    question: "Ort und Datum der Unterschrift",
    subquestion: "Wo und wann unterschreibst du das Formular?",
  },
];

function isThirdPartyKey(key: string): boolean {
  return /wohnungsgeber|beauftragt|eigentuemer|eigentümer|vermieter|arbeitgeber/.test(
    key.toLowerCase()
  );
}

function isAddressPartKey(key: string): boolean {
  const canonical = normalizeProfileKey(key);
  return (
    canonical === "strasse" ||
    canonical === "postleitzahl" ||
    canonical === "ort"
  );
}

function getAddressGroupId(key: string): string | null {
  if (key.toLowerCase().endsWith("_adresse") || key.toLowerCase().endsWith("_anschrift")) {
    return `address:${getAddressKeyPrefix(key)}`;
  }
  if (!isAddressPartKey(key)) return null;
  return `address:${getAddressKeyPrefix(key)}`;
}

function addressQuestionForPrefix(prefix: string): string {
  if (prefix.startsWith("wohnungsgeber")) {
    return "Wo wohnt oder sitzt dein Wohnungsgeber?";
  }
  if (prefix.startsWith("beauftragter")) {
    return "Adresse der beauftragten Person";
  }
  return "Wie lautet deine Adresse?";
}

function addressSubquestionForPrefix(prefix: string): string {
  if (prefix) {
    return "Straße und Hausnummer, Postleitzahl und Ort.";
  }
  return "Straße mit Hausnummer, Postleitzahl und Ort — wie im Formular.";
}

/** Drop vorname/nachname/hausnummer as separate questions; merge into name / strasse. */
export function consolidateMissingFields(
  fields: MissingField[]
): MissingField[] {
  const byCanonical = new Map<string, MissingField>();
  fields = filterExcludedFormFields(fields);
  let pendingName: MissingField | null = null;

  for (const field of fields) {
    if (isRepeatableFieldKey(field.key)) continue;

    const canonical = normalizeProfileKey(field.key);

    if (
      (canonical === "vorname" || canonical === "nachname") &&
      !isThirdPartyKey(field.key)
    ) {
      if (!pendingName) {
        pendingName = {
          ...field,
          key: "name",
          question: field.question.includes("?")
            ? field.question
            : "Wie heißt du?",
          type: "name",
        };
      }
      continue;
    }

    if (canonical === "hausnummer" && !isThirdPartyKey(field.key)) {
      continue;
    }

    if (canonical === "name" && !isThirdPartyKey(field.key)) {
      pendingName = {
        ...field,
        key: "name",
        type: "name",
        question: field.question.includes("?")
          ? field.question
          : "Wie heißt du?",
      };
      continue;
    }

    if (field.type === "address") {
      byCanonical.set(`address:${getAddressKeyPrefix(field.key)}`, field);
      continue;
    }

    const existing = byCanonical.get(canonical);
    if (!existing) {
      byCanonical.set(canonical, { ...field, key: canonical });
    }
  }

  if (pendingName) {
    byCanonical.set("name", pendingName);
  }

  return Array.from(byCanonical.values());
}

export function buildQuestionnaireSteps(
  fields: MissingField[],
  repeatableGroups: RepeatableGroup[] = []
): QuestionnaireStep[] {
  const consolidated = consolidateMissingFields(fields);
  const steps: QuestionnaireStep[] = [];
  const used = new Set<string>();

  const take = (field: MissingField) => {
    used.add(field.key);
    if (field.type === "address") {
      used.add(`address:${getAddressKeyPrefix(field.key)}`);
    }
  };

  // Address groups (own + third-party parts)
  const addressGroups = new Map<string, MissingField[]>();
  for (const field of consolidated) {
    const groupId = getAddressGroupId(field.key);
    if (!groupId) continue;
    const list = addressGroups.get(groupId) ?? [];
    list.push(field);
    addressGroups.set(groupId, list);
  }

  for (const [groupId, groupFields] of addressGroups) {
    groupFields.forEach(take);
    const prefix = groupId.replace(/^address:/, "");
    const anchor =
      groupFields.find((f) => f.type === "address") ??
      groupFields.find((f) => normalizeProfileKey(f.key) === "strasse") ??
      groupFields[0];

    steps.push({
      id: groupId,
      question:
        anchor.type === "address"
          ? anchor.question
          : addressQuestionForPrefix(prefix),
      subquestion:
        anchor.subquestion ?? addressSubquestionForPrefix(prefix),
      info: anchor.info,
      required: groupFields.some((f) => f.required !== false),
      reason: groupFields.some((f) => f.reason === "stale")
        ? "stale"
        : groupFields[0]?.reason,
      layout: "address",
      fields: groupFields,
      addressKey: anchor.key,
    });
  }

  // Static multi-field groups
  for (const group of STATIC_GROUPS) {
    const matched = consolidated.filter(
      (f) => group.keys.includes(normalizeProfileKey(f.key)) && !used.has(f.key)
    );
    if (matched.length === 0) continue;
    matched.forEach(take);

    steps.push({
      id: group.id,
      question: group.question,
      subquestion: group.subquestion,
      info: matched.find((f) => f.info)?.info,
      required: matched.some((f) => f.required !== false),
      reason: matched.some((f) => f.reason === "stale") ? "stale" : matched[0]?.reason,
      layout: "fields",
      fields: matched,
    });
  }

  // Repeatable field groups (e.g. household members 2–9)
  for (const group of repeatableGroups) {
    steps.push({
      id: `repeat:${group.id}`,
      question: group.question,
      subquestion: group.subquestion,
      info: group.info,
      required: group.required,
      layout: "repeat",
      fields: [],
      repeatGroup: group,
    });
  }

  // Elterngeld Bezugszeitraum (month grid per parent)
  for (const field of consolidated) {
    if (used.has(field.key)) continue;
    if (!isElterngeldScheduleField(field.key, field.question, field.type)) {
      continue;
    }
    take(field);
    steps.push({
      id: field.key,
      question: field.question,
      subquestion:
        field.subquestion ??
        "Wähle für jeden Elternteil die Monate mit Basis-Elterngeld oder Elterngeld Plus — oder die Standardoption für Monate 1–12.",
      info: field.info,
      required: field.required,
      reason: field.reason,
      layout: "elterngeld_schedule",
      fields: [{ ...field, type: "elterngeld_schedule" }],
    });
  }

  // Remaining single fields
  for (const field of consolidated) {
    if (used.has(field.key)) continue;
    take(field);
    steps.push({
      id: field.key,
      question: field.question,
      subquestion: field.subquestion,
      info: field.info,
      required: field.required,
      reason: field.reason,
      layout: "single",
      fields: [field],
    });
  }

  return steps;
}

export function getStepPdfFields(step: QuestionnaireStep): string[] {
  return [
    ...new Set(step.fields.flatMap((field) => field.pdf_fields ?? [])),
  ];
}

export function getStepAnswerKeys(
  step: QuestionnaireStep,
  repeatInstanceCounts?: Record<string, number>
): string[] {
  if (step.layout === "repeat" && step.repeatGroup) {
    const count = repeatInstanceCounts?.[step.repeatGroup.id] ?? 0;
    return getRepeatableGroupAnswerKeys(step.repeatGroup, count);
  }
  if (step.layout === "address" && step.addressKey) {
    const prefix = getAddressKeyPrefix(step.addressKey);
    return [`${prefix}strasse`, `${prefix}postleitzahl`, `${prefix}ort`];
  }
  return step.fields.map((f) => f.key);
}

function isAnswerValid(
  key: string,
  value: string,
  fields: MissingField[]
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const field = fields.find((candidate) => candidate.key === key);
  if (!field) {
    if (key.endsWith("postleitzahl")) {
      return isValidFieldValue(key, "number", trimmed);
    }
    return true;
  }

  return isValidFieldValue(field.key, field.type, trimmed);
}

export function isStepAnswered(
  step: QuestionnaireStep,
  answers: Record<string, string>,
  repeatInstanceCounts?: Record<string, number>
): boolean {
  if (step.layout === "elterngeld_schedule") {
    if (step.required === false) return true;
    const key = step.fields[0]?.key;
    if (!key) return false;
    return isElterngeldScheduleAnswered(answers[key] ?? "");
  }

  if (step.layout === "repeat") {
    if (step.required === false) return true;
    const keys = getStepAnswerKeys(step, repeatInstanceCounts);
    return keys.some((key) => {
      const field = step.repeatGroup?.fields.find((candidate) =>
        key.endsWith(`_${candidate.key}`)
      );
      const type = field?.type ?? "text";
      return isValidFieldValue(key, type, answers[key] ?? "");
    });
  }

  const keys = getStepAnswerKeys(step, repeatInstanceCounts);
  return keys.some((key) => isAnswerValid(key, answers[key] ?? "", step.fields));
}

export function formatFieldLabel(field: MissingField): string {
  return getFieldDisplayLabel(field.key);
}
