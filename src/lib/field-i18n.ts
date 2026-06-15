import { getFieldDisplayLabel, normalizeProfileKey } from "@/lib/field-keys";
import type { FieldType } from "@/lib/types";
import type { Translator } from "@/i18n/translate";

const LABEL_KEYS: Record<string, string> = {
  name: "fields.labels.name",
  strasse: "fields.labels.strasse",
  postleitzahl: "fields.labels.postleitzahl",
  ort: "fields.labels.ort",
  wohnort: "fields.labels.ort",
  einzugsdatum: "fields.labels.einzugsdatum",
  geburtsdatum: "fields.labels.geburtsdatum",
  geburtsort: "fields.labels.geburtsort",
  telefon: "fields.labels.telefon",
  email: "fields.labels.email",
  unterschrift_ort: "fields.labels.unterschrift_ort",
  unterschrift_datum: "fields.labels.unterschrift_datum",
  wohnungsanschrift: "fields.labels.wohnungsanschrift",
  familienstand: "fields.labels.familienstand",
  geschlecht: "fields.labels.geschlecht",
  religion: "fields.labels.religion",
  staatsangehoerigkeit: "fields.labels.staatsangehoerigkeit",
  wohnanschrift: "fields.labels.wohnanschrift",
  elterngeld_bezugszeitraum: "fields.labels.elterngeld_bezugszeitraum",
};

export function getLocalizedFieldDisplayLabel(key: string, t: Translator): string {
  const canonical = normalizeProfileKey(key);
  const labelKey = LABEL_KEYS[canonical] ?? LABEL_KEYS[key];
  if (labelKey) {
    const translated = t(labelKey);
    if (translated !== labelKey) return translated;
  }
  return getFieldDisplayLabel(key);
}

export function getLocalizedFieldPlaceholder(
  fieldKey: string,
  type: FieldType,
  t: Translator
): string {
  const canonical = normalizeProfileKey(fieldKey);
  if (canonical === "strasse" || canonical === "postleitzahl" || canonical === "ort") {
    const key = `fields.placeholders.${canonical}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  const typeKey = `fields.placeholders.${type}`;
  const translated = t(typeKey);
  if (translated !== typeKey) return translated;
  return t("fields.placeholders.default");
}

export function getLocalizedFieldHint(
  type: FieldType,
  t: Translator
): string | null {
  const key = `fields.hints.${type}`;
  const translated = t(key);
  return translated !== key ? translated : null;
}
