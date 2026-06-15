import { enrichMissingField } from "@/lib/field-types";
import { getFieldDisplayLabel } from "@/lib/field-keys";
import type { FieldType, MissingField, RepeatableGroup } from "@/lib/types";

const REPEATABLE_KEY_PATTERN =
  /^(person|personen|household_member|mitglied)_(\d+)_(.+)$/;

export const DEFAULT_HOUSEHOLD_GROUP: RepeatableGroup = {
  id: "person",
  question: "Weitere Personen im Haushalt",
  subquestion:
    "Optional — weitere einziehende Personen laut Formular (Plätze 2–9).",
  info: "Nur ausfüllen, wenn im Antrag weitere Personen mit einziehen. Person 1 bist in der Regel du — deine Angaben wurden bereits abgefragt.",
  maxInstances: 8,
  startIndex: 2,
  required: false,
  fields: [
    { key: "name", label: "Name", type: "name" },
    { key: "geburtsdatum", label: "Geburtsdatum", type: "date" },
    { key: "geburtsort", label: "Geburtsort", type: "text" },
  ],
};

export function parseRepeatableFieldKey(key: string): {
  groupId: string;
  index: number;
  fieldKey: string;
} | null {
  const k = key
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const match = k.match(REPEATABLE_KEY_PATTERN);
  if (!match) return null;

  return {
    groupId: match[1],
    index: Number(match[2]),
    fieldKey: match[3],
  };
}

export function isRepeatableFieldKey(key: string): boolean {
  const parsed = parseRepeatableFieldKey(key);
  return parsed !== null && parsed.index >= 2;
}

export function buildRepeatableFieldKey(
  groupId: string,
  index: number,
  fieldKey: string
): string {
  const group = groupId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const field = fieldKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `${group}_${index}_${field}`;
}

export function getRepeatableFieldLabel(
  group: RepeatableGroup,
  fieldKey: string
): string {
  const template = group.fields.find((field) => field.key === fieldKey);
  return template?.label ?? getFieldDisplayLabel(fieldKey);
}

export function getRepeatableGroupAnswerKeys(
  group: RepeatableGroup,
  instanceCount: number
): string[] {
  const keys: string[] = [];
  const endIndex = group.startIndex + instanceCount - 1;

  for (let index = group.startIndex; index <= endIndex; index += 1) {
    for (const field of group.fields) {
      keys.push(buildRepeatableFieldKey(group.id, index, field.key));
    }
  }

  return keys;
}

export function countRepeatInstancesFromAnswers(
  group: RepeatableGroup,
  answers: Record<string, string>
): number {
  let maxIndex = 0;

  for (let index = group.startIndex; index < group.startIndex + group.maxInstances; index += 1) {
    const hasValue = group.fields.some((field) => {
      const key = buildRepeatableFieldKey(group.id, index, field.key);
      return Boolean(answers[key]?.trim());
    });
    if (hasValue) {
      maxIndex = index - group.startIndex + 1;
    }
  }

  return maxIndex;
}

export function clearRepeatInstanceAnswers(
  group: RepeatableGroup,
  index: number,
  answers: Record<string, string>
): Record<string, string> {
  const next = { ...answers };
  for (const field of group.fields) {
    delete next[buildRepeatableFieldKey(group.id, index, field.key)];
  }
  return next;
}

export function inferRepeatableGroupsFromText(pdfText: string): RepeatableGroup[] {
  const lower = pdfText.toLowerCase();
  const hasPersonTable =
    /person(?:en)?\s*\(\s*1\s*[-–]\s*9\s*\)/.test(lower) ||
    (/person\s*1\b/.test(lower) && /person\s*[2-9]\b/.test(lower));

  if (!hasPersonTable) return [];
  return [DEFAULT_HOUSEHOLD_GROUP];
}

export function normalizeRepeatableGroups(
  groups: RepeatableGroup[] | undefined
): RepeatableGroup[] {
  if (!groups?.length) return [];

  return groups
    .map((group) => ({
      ...DEFAULT_HOUSEHOLD_GROUP,
      ...group,
      id: group.id?.trim() || DEFAULT_HOUSEHOLD_GROUP.id,
      maxInstances: Math.min(
        Math.max(group.maxInstances ?? DEFAULT_HOUSEHOLD_GROUP.maxInstances, 1),
        20
      ),
      startIndex: group.startIndex ?? DEFAULT_HOUSEHOLD_GROUP.startIndex,
      fields: (group.fields?.length ? group.fields : DEFAULT_HOUSEHOLD_GROUP.fields).map(
        (field) => ({
          key: field.key,
          label: field.label || getFieldDisplayLabel(field.key),
          type: field.type,
          required: field.required,
        })
      ),
    }))
    .filter((group) => group.fields.length > 0);
}

export function repeatableGroupToMissingFields(
  group: RepeatableGroup
): MissingField[] {
  return group.fields.map((field) =>
    enrichMissingField({
      key: field.key,
      question: field.label,
      type: field.type as FieldType,
      options: field.options,
      required: field.required ?? false,
      reason: "missing",
    })
  );
}

export function indexedProfileKeysForGroup(group: RepeatableGroup): string[] {
  const keys: string[] = [];
  for (
    let index = group.startIndex;
    index < group.startIndex + group.maxInstances;
    index += 1
  ) {
    for (const field of group.fields) {
      keys.push(buildRepeatableFieldKey(group.id, index, field.key));
    }
  }
  return keys;
}
