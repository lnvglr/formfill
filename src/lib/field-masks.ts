import type { MaskInputOptions } from "maska";
import { normalizeProfileKey } from "@/lib/field-keys";
import type { FieldType } from "@/lib/types";

export type FieldMaskConfig = MaskInputOptions & {
  validate: (value: string) => boolean;
};

const GERMAN_DATE_MASK: FieldMaskConfig = {
  mask: "##.##.####",
  validate: isValidGermanDate,
};

const PLZ_MASK: FieldMaskConfig = {
  mask: "#####",
  eager: true,
  validate: (value) => /^\d{5}$/.test(value),
};

const PHONE_MASK: FieldMaskConfig = {
  mask: [
    "+## ### #######",
    "+## #### ########",
    "0### #######",
    "0#### #######",
  ],
  validate: isValidPhone,
};

export function isValidGermanDate(value: string): boolean {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function isValidPlz(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

export function normalizeDateForDisplay(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const [, year, month, day] = iso;
    return `${day}.${month}.${year}`;
  }

  return trimmed;
}

export function getFieldMaskConfig(
  fieldKey: string,
  type: FieldType
): FieldMaskConfig | null {
  const canonical = normalizeProfileKey(fieldKey);

  if (type === "date" || /datum/.test(canonical)) {
    return GERMAN_DATE_MASK;
  }
  if (canonical === "postleitzahl" || canonical === "plz") {
    return PLZ_MASK;
  }
  if (type === "phone" || canonical === "telefon") {
    return PHONE_MASK;
  }

  return null;
}

export function isValidFieldValue(
  fieldKey: string,
  type: FieldType,
  value: string
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const config = getFieldMaskConfig(fieldKey, type);
  if (!config) return true;

  return config.validate(trimmed);
}

export function isPartialMaskedValue(
  fieldKey: string,
  type: FieldType,
  value: string
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const config = getFieldMaskConfig(fieldKey, type);
  if (!config) return false;

  return !config.validate(trimmed);
}
