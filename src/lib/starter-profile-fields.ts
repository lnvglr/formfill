import type { FieldType, ProfileData } from "@/lib/types";

export type StarterProfileField = {
  key: string;
  label: string;
  type: FieldType;
};

export const STARTER_PROFILE_FIELDS: StarterProfileField[] = [
  { key: "name", label: "Name", type: "name" },
  { key: "geburtsdatum", label: "Geburtsdatum", type: "date" },
  { key: "geburtsort", label: "Geburtsort", type: "text" },
  { key: "strasse", label: "Adresse", type: "address" },
  { key: "telefon", label: "Telefon", type: "phone" },
  { key: "email", label: "E-Mail", type: "email" },
];

export const STARTER_PROFILE_KEYS = [
  "name",
  "geburtsdatum",
  "geburtsort",
  "strasse",
  "postleitzahl",
  "ort",
  "telefon",
  "email",
] as const;

export function pickStarterValues(profile: ProfileData): Record<string, string> {
  return Object.fromEntries(
    STARTER_PROFILE_KEYS.map((key) => [key, profile[key] ?? ""])
  );
}

export function countStarterFieldsFilled(profile: ProfileData): number {
  let count = 0;

  if (profile.name?.trim()) count += 1;
  if (profile.geburtsdatum?.trim()) count += 1;
  if (profile.geburtsort?.trim()) count += 1;
  if (
    profile.strasse?.trim() ||
    profile.postleitzahl?.trim() ||
    profile.ort?.trim()
  ) {
    count += 1;
  }
  if (profile.telefon?.trim()) count += 1;
  if (profile.email?.trim()) count += 1;

  return count;
}

export function hasStarterFields(profile: ProfileData): boolean {
  return countStarterFieldsFilled(profile) > 0;
}
