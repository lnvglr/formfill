import { isAddressFieldKey, isMovingFieldKey } from "@/lib/field-keys";
import { isElterngeldScheduleField } from "@/lib/elterngeld-schedule";
import { isRepeatableFieldKey } from "@/lib/repeatable-fields";

const STORAGE_KEY = "formfill:session-fields";

/** Form-context fields: draft in sessionStorage until the application is saved. */
export function isSessionOnlyFieldKey(key: string): boolean {
  if (isRepeatableFieldKey(key)) return true;
  if (isElterngeldScheduleField(key)) return true;
  if (isMovingFieldKey(key)) return true;
  const raw = key.toLowerCase();
  return /anmeld|ummeld|einzieh/.test(raw) && !isAddressFieldKey(key);
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readSessionFields(): Record<string, string> {
  if (!canUseSessionStorage()) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function mergeSessionFields(updates: Record<string, string>): void {
  if (!canUseSessionStorage()) return;

  const next = { ...readSessionFields() };
  for (const [key, value] of Object.entries(updates)) {
    if (!isSessionOnlyFieldKey(key)) continue;
    const trimmed = value?.trim();
    if (trimmed) next[key] = trimmed;
    else delete next[key];
  }

  if (Object.keys(next).length === 0) {
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

export function clearSessionFields(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function pickSessionFields(
  data: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSessionOnlyFieldKey(key) && value?.trim()) {
      result[key] = value.trim();
    }
  }
  return result;
}

export function omitSessionFields(
  data: Record<string, string>
): Record<string, string> {
  const result = { ...data };
  for (const key of Object.keys(result)) {
    if (isSessionOnlyFieldKey(key)) delete result[key];
  }
  return result;
}
