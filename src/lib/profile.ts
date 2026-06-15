import type { ProfileData } from "@/lib/types";

export function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getProfileOwnerName(profile: ProfileData): string | null {
  const name = profile.name?.trim();
  if (name) return name;

  const vorname = profile.vorname?.trim();
  const nachname = profile.nachname?.trim();
  if (vorname && nachname) return `${vorname} ${nachname}`;
  if (vorname) return vorname;
  if (nachname) return nachname;

  return null;
}

export function getCompleteness(profile: Record<string, string>): number {
  const keys = Object.keys(profile);
  if (keys.length === 0) return 0;
  return Math.min(100, Math.round((keys.length / 20) * 100));
}
