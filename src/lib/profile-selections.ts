export type ProfileSelections = {
  emailId?: string;
  phoneId?: string;
  addressId?: string;
};

const STORAGE_KEY = "formfill:profile-selections";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readProfileSelections(): ProfileSelections {
  if (!canUseSessionStorage()) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as ProfileSelections;
  } catch {
    return {};
  }
}

export function mergeProfileSelections(updates: ProfileSelections): void {
  if (!canUseSessionStorage()) return;
  const next = { ...readProfileSelections(), ...updates };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearProfileSelections(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(STORAGE_KEY);
}
