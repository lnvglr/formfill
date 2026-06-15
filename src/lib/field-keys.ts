import { formatKey } from "@/lib/profile";
import {
  isRepeatableFieldKey,
  parseRepeatableFieldKey,
} from "@/lib/repeatable-fields";
import type { ProfileData } from "@/lib/types";

/** Canonical keys we prefer across all forms */
export const CANONICAL_FIELD_KEYS = [
  "name",
  "strasse",
  "postleitzahl",
  "ort",
  "einzugsdatum",
  "geburtsdatum",
  "geburtsort",
  "telefon",
  "email",
  "unterschrift_ort",
  "unterschrift_datum",
] as const;

export type CanonicalFieldKey = (typeof CANONICAL_FIELD_KEYS)[number];

const DISPLAY_LABELS: Record<string, string> = {
  name: "Name",
  strasse: "Straße und Hausnummer",
  postleitzahl: "PLZ",
  ort: "Ort",
  wohnort: "Ort",
  einzugsdatum: "Einzugsdatum",
  geburtsdatum: "Geburtsdatum",
  geburtsort: "Geburtsort",
  telefon: "Telefon",
  email: "E-Mail",
  unterschrift_ort: "Ort (Unterschrift)",
  unterschrift_datum: "Datum (Unterschrift)",
  wohnungsanschrift: "Wohnanschrift",
  familienstand: "Familienstand",
  geschlecht: "Geschlecht",
  religion: "Religion / Konfession",
  staatsangehoerigkeit: "Staatsangehörigkeit",
  wohnanschrift: "Wohnanschrift",
  elterngeld_bezugszeitraum: "Elterngeld Bezugszeitraum",
};

/** Keys that satisfy the same semantic slot in the profile */
const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "voller_name", "vollname", "full_name", "vorname", "nachname"],
  strasse: ["strasse", "straße", "street", "hausnummer", "haus_nr", "hnr"],
  postleitzahl: ["postleitzahl", "plz", "zip"],
  ort: ["ort", "wohnort", "stadt", "wohnstadt"],
  einzugsdatum: ["einzugsdatum", "einzug_datum", "einzieh_datum", "einziehdatum"],
  geburtsdatum: ["geburtsdatum", "geburtstag"],
  geburtsort: ["geburtsort"],
  telefon: ["telefon", "phone", "handy", "mobil"],
  email: ["email", "e_mail", "mail"],
};

const ADDRESS_KEYS = new Set([
  "strasse",
  "postleitzahl",
  "ort",
  "wohnungsanschrift",
  "wohnanschrift",
  "adresse",
  "anschrift",
]);

const MOVING_KEYS = new Set(["einzugsdatum", "unterschrift_ort", "unterschrift_datum"]);

/**
 * Signature lines for the landlord or their representative must stay empty
 * on the PDF so they can sign by hand.
 */
export function isThirdPartySignatureField(
  key: string,
  question = ""
): boolean {
  const haystack = `${key} ${question}`.toLowerCase();
  if (!/unterschrift/.test(haystack)) return false;

  const canonical = normalizeProfileKey(key);
  if (canonical === "unterschrift_ort" || canonical === "unterschrift_datum") {
    return false;
  }

  if (
    /einzieh|antragsteller|einziehend|eigene_person/.test(haystack) &&
    !/wohnungsgeber|vermieter/.test(haystack)
  ) {
    return false;
  }

  return /wohnungsgeber|beauftragt|vermieter|eigentu[eë]mer/.test(haystack);
}

/** Flat (non-repeatable) person 2–9 fields from AI — use repeatable groups instead. */
export function isAdditionalHouseholdMemberField(
  key: string,
  question = ""
): boolean {
  if (isRepeatableFieldKey(key)) return false;

  const haystack = `${key} ${question}`.toLowerCase();

  if (/person(?:en)?\s*[_-]?\s*[2-9]\b/.test(haystack)) return true;
  if (/\bperson\s*[2-9]\b/.test(haystack)) return true;

  return false;
}

export function filterThirdPartySignatureFields<
  T extends { key: string; question?: string },
>(fields: T[]): T[] {
  return fields.filter(
    (field) => !isThirdPartySignatureField(field.key, field.question ?? "")
  );
}

export function filterExcludedFormFields<
  T extends { key: string; question?: string },
>(fields: T[]): T[] {
  return filterThirdPartySignatureFields(fields).filter(
    (field) =>
      !isAdditionalHouseholdMemberField(field.key, field.question ?? "")
  );
}

export function isExcludedPdfMapping(mapping: {
  label?: string;
  profile_key?: string;
  pdf_field?: string;
}): boolean {
  const candidates = [
    mapping.label,
    mapping.profile_key,
    mapping.pdf_field,
  ].filter(Boolean) as string[];

  return candidates.some((part) =>
    isThirdPartySignatureField(part, mapping.label ?? "")
  );
}

function slugKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Map form-specific keys to canonical profile keys (generic rules, not per-form).
 */
export function normalizeProfileKey(key: string): string {
  const k = slugKey(key);

  const repeatable = parseRepeatableFieldKey(k);
  if (repeatable && repeatable.index >= 2) {
    return k;
  }

  if (/^unterschrift_ort$|ort_unterschrift/.test(k)) return "unterschrift_ort";
  if (/^unterschrift_datum$|datum_unterschrift/.test(k)) return "unterschrift_datum";
  if (/geburtsort/.test(k)) return "geburtsort";
  if (/geburtsdatum|geburtstag/.test(k)) return "geburtsdatum";
  if (/einzug.*datum|einzieh.*datum/.test(k)) return "einzugsdatum";
  if (/familienstand|zivilstand|ehestand/.test(k)) return "familienstand";
  if (/geschlecht|\bsex\b|gender/.test(k)) return "geschlecht";
  if (/religion|konfession|kirchensteuer/.test(k)) return "religion";
  if (/staatsangehor|staatsangeh|nationalit|staatsbuerger/.test(k)) {
    return "staatsangehoerigkeit";
  }

  // Applicant name — always one field "name"
  if (/wohnungsgeber|vermieter/.test(k) && /name|vorname|nachname|familienname/.test(k)) {
    return "wohnungsgeber_name";
  }
  if (/beauftragt|eigene_person/.test(k) && /name|vorname|nachname/.test(k)) {
    return "beauftragter_name";
  }
  if (
    /^name$/.test(k) ||
    /^vorname$/.test(k) ||
    /^nachname$/.test(k) ||
    /vor_und_nachname|vorname_und_nachname/.test(k) ||
    /familienname/.test(k) ||
    /einzieh.*person|person.*einzieh|einziehende/.test(k) ||
    (/person(?:en)?[_-]?1\b/.test(k) &&
      /name|vorname|nachname|familienname/.test(k))
  ) {
    return "name";
  }

  if (
    /^strasse$|^straße$/.test(k) ||
    /hausnummer|haus_nr|hnr/.test(k) ||
    (k.includes("strasse") && !/geber|beauftragt|eigent/.test(k))
  ) {
    return "strasse";
  }
  if (/postleitzahl|^plz$/.test(k) && !/geber|beauftragt/.test(k)) return "postleitzahl";

  if (
    (/^ort$|^wohnort$|^stadt$/.test(k) || (k.endsWith("_ort") && !/geburts|unterschrift/.test(k))) &&
    !/geber|beauftragt|eigent/.test(k)
  ) {
    return "ort";
  }

  if (/wohnungsanschrift|wohnanschrift/.test(k) && !/geber/.test(k)) {
    return "wohnungsanschrift";
  }

  return k;
}

export function getFieldDisplayLabel(key: string): string {
  const canonical = normalizeProfileKey(key);
  if (DISPLAY_LABELS[canonical]) return DISPLAY_LABELS[canonical];
  if (DISPLAY_LABELS[key]) return DISPLAY_LABELS[key];

  const formatted = formatKey(canonical);
  return formatted.replace(/\s+\d+$/, "").trim();
}

export function profileHasCanonicalField(
  profile: ProfileData,
  canonicalKey: string
): boolean {
  const normalized = normalizeProfileKey(canonicalKey);

  if (normalized === "name") {
    if (hasValue(profile.name) || hasValue(profile.voller_name)) return true;
    if (hasValue(profile.vorname) || hasValue(profile.nachname)) return true;
    return Object.entries(profile).some(
      ([k, v]) =>
        hasValue(v) &&
        /einzieh|antragsteller|applicant/.test(k) &&
        /name|person/.test(k)
    );
  }

  if (normalized === "strasse") {
    if (hasValue(profile.strasse) || hasValue(profile.hausnummer)) return true;
    return Object.keys(profile).some(
      (k) => normalizeProfileKey(k) === "strasse" && hasValue(profile[k])
    );
  }

  const aliases = FIELD_ALIASES[normalized] ?? [normalized];
  if (aliases.some((alias) => hasValue(profile[alias]))) return true;

  return Object.keys(profile).some(
    (k) => normalizeProfileKey(k) === normalized && hasValue(profile[k])
  );
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function dedupeMissingFieldsByCanonical<
  T extends { key: string },
>(fields: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const field of fields) {
    const canonical = isRepeatableFieldKey(field.key)
      ? field.key
      : normalizeProfileKey(field.key);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    result.push({ ...field, key: canonical } as T);
  }

  return result;
}

export function filterFieldsNotInProfile<T extends { key: string }>(
  fields: T[],
  profile: ProfileData
): T[] {
  return fields.filter((field) => !profileHasCanonicalField(profile, field.key));
}

export function isAddressFieldKey(key: string): boolean {
  return ADDRESS_KEYS.has(normalizeProfileKey(key));
}

export function isMovingFieldKey(key: string): boolean {
  return MOVING_KEYS.has(normalizeProfileKey(key));
}

export const ADDRESS_FIELD_ORDER = [
  "strasse",
  "postleitzahl",
  "ort",
  "wohnungsanschrift",
  "wohnanschrift",
  "adresse",
] as const;

export function sortFieldsInGroup(
  fields: { key: string }[],
  groupId: string
): { key: string }[] {
  if (groupId !== "address") {
    return [...fields].sort((a, b) =>
      getFieldDisplayLabel(a.key).localeCompare(
        getFieldDisplayLabel(b.key),
        "de"
      )
    );
  }

  const orderIndex = (key: string) => {
    const canonical = normalizeProfileKey(key);
    const idx = ADDRESS_FIELD_ORDER.indexOf(
      canonical as (typeof ADDRESS_FIELD_ORDER)[number]
    );
    return idx === -1 ? 100 : idx;
  };

  return [...fields].sort((a, b) => {
    const orderDiff = orderIndex(a.key) - orderIndex(b.key);
    if (orderDiff !== 0) return orderDiff;
    return getFieldDisplayLabel(a.key).localeCompare(
      getFieldDisplayLabel(b.key),
      "de"
    );
  });
}

export function getStreetLineFromProfile(
  profile: Record<string, string>,
  prefix = ""
): string {
  const strasse = profile[`${prefix}strasse`]?.trim() ?? "";
  const hausnummer = profile[`${prefix}hausnummer`]?.trim() ?? "";
  if (!strasse && !hausnummer) return "";
  if (!hausnummer) return strasse;
  if (!strasse) return hausnummer;
  if (strasse.includes(hausnummer)) return strasse;
  return `${strasse} ${hausnummer}`;
}

/** Merge split name/address fields into canonical single fields before save. */
export function normalizeProfileData(
  data: Record<string, string>
): Record<string, string> {
  const working: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    working[key] = trimmed;
  }

  const prefixes = ["", "wohnungsgeber_", "beauftragter_"];
  for (const prefix of prefixes) {
    const street = getStreetLineFromProfile(working, prefix);
    if (street) {
      working[`${prefix}strasse`] = street;
    }
    delete working[`${prefix}hausnummer`];
  }

  if (!working.name?.trim()) {
    const combined = [working.vorname, working.nachname]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (combined) working.name = combined;
  }
  delete working.vorname;
  delete working.nachname;

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(working)) {
    result[normalizeProfileKey(key)] = value;
  }

  return result;
}
