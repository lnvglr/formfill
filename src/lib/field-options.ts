/** Predefined option sets for German form fields (free solo still allowed). */
export const FIELD_OPTION_SETS = {
  familienstand: [
    "ledig",
    "verheiratet",
    "verwitwet",
    "geschieden",
    "eingetragene Lebenspartnerschaft",
    "aufgehobene Lebenspartnerschaft",
  ],
  geschlecht: ["männlich", "weiblich", "divers", "ohne Angabe"],
  religion: [
    "konfessionslos",
    "evangelisch",
    "katholisch",
    "islamisch",
    "jüdisch",
    "ohne Angabe",
  ],
  staatsangehoerigkeit: [
    "deutsch",
    "österreichisch",
    "schweizerisch",
    "türkisch",
    "polnisch",
    "italienisch",
    "rumänisch",
    "kroatisch",
    "griechisch",
    "syrisch",
    "afghanisch",
    "ukrainisch",
    "britisch",
    "amerikanisch",
    "französisch",
    "spanisch",
    "staatenlos",
  ],
} as const;

export type FieldOptionSetId = keyof typeof FIELD_OPTION_SETS;

export function resolveFieldOptionSetId(
  key: string,
  question = ""
): FieldOptionSetId | null {
  const haystack = `${key} ${question}`.toLowerCase();

  if (/familienstand|zivilstand|ehestand/.test(haystack)) {
    return "familienstand";
  }
  if (/geschlecht|\bsex\b|gender/.test(haystack)) {
    return "geschlecht";
  }
  if (/religion|konfession|kirchensteuer|glaubensbekenntnis/.test(haystack)) {
    return "religion";
  }
  if (/staatsangehor|staatsangeh|nationalit|citizenship|staatsbuerger/.test(haystack)) {
    return "staatsangehoerigkeit";
  }

  return null;
}

export function getFieldOptions(
  key: string,
  question = "",
  explicit?: string[]
): string[] {
  if (explicit?.length) {
    return explicit.map((option) => option.trim()).filter(Boolean);
  }

  const setId = resolveFieldOptionSetId(key, question);
  if (!setId) return [];

  return [...FIELD_OPTION_SETS[setId]];
}

export function shouldUseCombobox(
  key: string,
  question: string,
  type?: string,
  explicit?: string[]
): boolean {
  if (type === "combobox") return true;
  if (explicit?.length) return true;
  return resolveFieldOptionSetId(key, question) !== null;
}
