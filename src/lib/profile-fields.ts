import {
  classifyFieldKey,
  getFreshnessStatus,
} from "@/lib/profile-freshness";
import type { ProfileData, ProfileField } from "@/lib/types";

type RawProfileField = {
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
};

export function enrichProfileFields(raw: RawProfileField[]): ProfileField[] {
  return raw.map((field) => ({
    ...field,
    freshness_tier: classifyFieldKey(field.key),
    freshness: getFreshnessStatus(field.key, field.updated_at),
  }));
}

export function toProfileData(fields: ProfileField[]): ProfileData {
  return Object.fromEntries(fields.map((f) => [f.key, f.value]));
}

export function mergeProfileFields(
  fields: ProfileField[],
  updates: ProfileData
): ProfileField[] {
  const now = new Date().toISOString();
  const map = new Map(fields.map((f) => [f.key, f]));

  for (const [key, value] of Object.entries(updates)) {
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        value,
        updated_at: now,
        freshness: getFreshnessStatus(key, now),
      });
    } else {
      map.set(key, {
        key,
        value,
        created_at: now,
        updated_at: now,
        freshness_tier: classifyFieldKey(key),
        freshness: getFreshnessStatus(key, now),
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}
