import {
  getStreetLineFromProfile,
  normalizeProfileKey,
  profileHasCanonicalField,
} from "@/lib/field-keys";
import type { ProfileData } from "@/lib/types";

export type ProfileValueEntry = {
  id: string;
  value: string;
  label?: string;
};

export type ProfileAddressEntry = {
  id: string;
  label?: string;
  strasse: string;
  postleitzahl: string;
  ort: string;
};

export type ProfileMultiStore = {
  emails: ProfileValueEntry[];
  phones: ProfileValueEntry[];
  addresses: ProfileAddressEntry[];
  defaults?: {
    emailId?: string;
    phoneId?: string;
    addressId?: string;
  };
};

export type MultiValueFamily = "email" | "phone" | "address";

export type ProfileValueOption = {
  id: string;
  label: string;
  value: string;
};

export const EMPTY_PROFILE_MULTI: ProfileMultiStore = {
  emails: [],
  phones: [],
  addresses: [],
};

export function createProfileEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `id_${Date.now().toString(36)}`;
}

export function getMultiValueFamily(fieldKey: string): MultiValueFamily | null {
  const canonical = normalizeProfileKey(fieldKey);
  if (canonical === "email") return "email";
  if (canonical === "telefon") return "phone";
  if (canonical === "strasse" || canonical === "postleitzahl" || canonical === "ort") {
    return "address";
  }
  return null;
}

export function isMultiValueFieldKey(fieldKey: string): boolean {
  return getMultiValueFamily(fieldKey) !== null;
}

function formatAddressLabel(entry: ProfileAddressEntry): string {
  const street = entry.strasse.trim();
  const city = [entry.postleitzahl.trim(), entry.ort.trim()]
    .filter(Boolean)
    .join(" ");
  const line = [street, city].filter(Boolean).join(", ");
  if (entry.label?.trim()) return `${entry.label.trim()} — ${line}`;
  return line || "Adresse";
}

function getDefaultEntryId<T extends { id: string }>(
  entries: T[],
  preferredId?: string
): string | undefined {
  if (entries.length === 0) return undefined;
  if (preferredId && entries.some((entry) => entry.id === preferredId)) {
    return preferredId;
  }
  return entries[0]?.id;
}

export function hydrateMultiFromProfile(
  profile: ProfileData,
  existing?: ProfileMultiStore
): ProfileMultiStore {
  const multi: ProfileMultiStore = existing
    ? structuredClone(existing)
    : { emails: [], phones: [], addresses: [], defaults: {} };

  multi.defaults ??= {};

  if (multi.emails.length === 0 && profile.email?.trim()) {
    const id = createProfileEntryId();
    multi.emails.push({ id, value: profile.email.trim(), label: "Haupt" });
    multi.defaults.emailId = id;
  }

  if (multi.phones.length === 0 && profile.telefon?.trim()) {
    const id = createProfileEntryId();
    multi.phones.push({ id, value: profile.telefon.trim(), label: "Haupt" });
    multi.defaults.phoneId = id;
  }

  if (
    multi.addresses.length === 0 &&
    (profile.strasse?.trim() ||
      profile.postleitzahl?.trim() ||
      profile.ort?.trim())
  ) {
    const id = createProfileEntryId();
    multi.addresses.push({
      id,
      label: "Haupt",
      strasse: profile.strasse?.trim() ?? "",
      postleitzahl: profile.postleitzahl?.trim() ?? "",
      ort: profile.ort?.trim() ?? "",
    });
    multi.defaults.addressId = id;
  }

  multi.defaults.emailId = getDefaultEntryId(
    multi.emails,
    multi.defaults.emailId
  );
  multi.defaults.phoneId = getDefaultEntryId(
    multi.phones,
    multi.defaults.phoneId
  );
  multi.defaults.addressId = getDefaultEntryId(
    multi.addresses,
    multi.defaults.addressId
  );

  return multi;
}

export function syncProfileFromMulti(
  profile: ProfileData,
  multi: ProfileMultiStore
): ProfileData {
  const next = { ...profile };
  const hydrated = hydrateMultiFromProfile(profile, multi);

  const email = resolveEmailValue(hydrated);
  if (email) next.email = email;
  else delete next.email;

  const phone = resolvePhoneValue(hydrated);
  if (phone) next.telefon = phone;
  else delete next.telefon;

  const address = resolveAddressBundle(hydrated);
  if (address) {
    next.strasse = address.strasse;
    next.postleitzahl = address.postleitzahl;
    next.ort = address.ort;
  } else {
    delete next.strasse;
    delete next.postleitzahl;
    delete next.ort;
  }

  return next;
}

export function listEmailOptions(multi: ProfileMultiStore): ProfileValueOption[] {
  return multi.emails
    .filter((entry) => entry.value.trim())
    .map((entry) => ({
      id: entry.id,
      label: entry.label?.trim() || entry.value.trim(),
      value: entry.value.trim(),
    }));
}

export function listPhoneOptions(multi: ProfileMultiStore): ProfileValueOption[] {
  return multi.phones
    .filter((entry) => entry.value.trim())
    .map((entry) => ({
      id: entry.id,
      label: entry.label?.trim() || entry.value.trim(),
      value: entry.value.trim(),
    }));
}

export function listAddressOptions(
  multi: ProfileMultiStore
): ProfileValueOption[] {
  return multi.addresses
    .filter(
      (entry) =>
        entry.strasse.trim() ||
        entry.postleitzahl.trim() ||
        entry.ort.trim()
    )
    .map((entry) => ({
      id: entry.id,
      label: formatAddressLabel(entry),
      value: entry.id,
    }));
}

export function resolveEmailValue(
  multi: ProfileMultiStore,
  selectedId?: string
): string | null {
  const id = selectedId ?? multi.defaults?.emailId;
  const entry = multi.emails.find((item) => item.id === id) ?? multi.emails[0];
  return entry?.value.trim() || null;
}

export function resolvePhoneValue(
  multi: ProfileMultiStore,
  selectedId?: string
): string | null {
  const id = selectedId ?? multi.defaults?.phoneId;
  const entry = multi.phones.find((item) => item.id === id) ?? multi.phones[0];
  return entry?.value.trim() || null;
}

export function resolveAddressEntry(
  multi: ProfileMultiStore,
  selectedId?: string
): ProfileAddressEntry | null {
  const id = selectedId ?? multi.defaults?.addressId;
  return (
    multi.addresses.find((item) => item.id === id) ?? multi.addresses[0] ?? null
  );
}

export function resolveAddressBundle(
  multi: ProfileMultiStore,
  selectedId?: string
): ProfileAddressEntry | null {
  const entry = resolveAddressEntry(multi, selectedId);
  if (!entry) return null;
  if (
    !entry.strasse.trim() &&
    !entry.postleitzahl.trim() &&
    !entry.ort.trim()
  ) {
    return null;
  }
  return entry;
}

export function resolveMultiProfileValue(
  profile: ProfileData,
  multi: ProfileMultiStore | undefined,
  fieldKey: string,
  selectedId?: string
): string | null {
  const family = getMultiValueFamily(fieldKey);
  if (!multi || !family) {
    return profile[normalizeProfileKey(fieldKey)]?.trim() ?? null;
  }

  if (family === "email") {
    return resolveEmailValue(multi, selectedId);
  }

  if (family === "phone") {
    return resolvePhoneValue(multi, selectedId);
  }

  const canonical = normalizeProfileKey(fieldKey);
  const address = resolveAddressBundle(multi, selectedId);
  if (!address) {
    if (canonical === "strasse") {
      return getStreetLineFromProfile(profile, "") || null;
    }
    return profile[canonical]?.trim() ?? null;
  }

  if (canonical === "strasse") return address.strasse.trim() || null;
  if (canonical === "postleitzahl") return address.postleitzahl.trim() || null;
  if (canonical === "ort") return address.ort.trim() || null;

  return null;
}

export function getAddressValuesForSelection(
  multi: ProfileMultiStore,
  selectedId?: string,
  prefix = ""
): Record<string, string> {
  const entry = resolveAddressEntry(multi, selectedId);
  if (!entry) return {};

  const result: Record<string, string> = {};
  if (entry.strasse.trim()) {
    result[`${prefix}strasse`] = entry.strasse.trim();
  }
  if (entry.postleitzahl.trim()) {
    result[`${prefix}postleitzahl`] = entry.postleitzahl.trim();
  }
  if (entry.ort.trim()) {
    result[`${prefix}ort`] = entry.ort.trim();
  }
  return result;
}

export function shouldSkipProfileQuestion(
  profile: ProfileData,
  multi: ProfileMultiStore | undefined,
  fieldKey: string
): boolean {
  const family = getMultiValueFamily(fieldKey);
  if (multi && family) {
    const count =
      family === "email"
        ? listEmailOptions(multi).length
        : family === "phone"
          ? listPhoneOptions(multi).length
          : listAddressOptions(multi).length;
    if (count > 1) return false;
    if (count === 1) return true;
  }

  return profileHasCanonicalField(profile, fieldKey);
}
