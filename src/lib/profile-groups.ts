import {
  getFieldDisplayLabel,
  isAddressFieldKey,
  isMovingFieldKey,
  normalizeProfileKey,
  sortFieldsInGroup,
} from "@/lib/field-keys";
import { PROFILE_SIGNATURE_KEY } from "@/lib/signature";
import type { ProfileField } from "@/lib/types";

export type ProfileGroupId =
  | "personal"
  | "address"
  | "moving"
  | "contact"
  | "landlord"
  | "landlord_not_owner"
  | "authorized_person"
  | "employment"
  | "signature"
  | "other";

type ProfileGroupMeta = {
  id: ProfileGroupId;
  label: string;
  order: number;
};

const PROFILE_GROUPS: ProfileGroupMeta[] = [
  { id: "personal", label: "Persönliche Daten", order: 0 },
  { id: "address", label: "Adresse & Wohnung", order: 1 },
  { id: "moving", label: "Einzug & Anmeldung", order: 2 },
  { id: "contact", label: "Kontakt", order: 3 },
  { id: "landlord", label: "Wohnungsgeber", order: 4 },
  { id: "landlord_not_owner", label: "Wohnungsgeber (nicht Eigentümer)", order: 5 },
  { id: "authorized_person", label: "Beauftragte Person", order: 6 },
  { id: "employment", label: "Arbeit & Beruf", order: 7 },
  { id: "signature", label: "Unterschrift", order: 8 },
  { id: "other", label: "Sonstiges", order: 99 },
];

const GROUP_BY_ID = Object.fromEntries(
  PROFILE_GROUPS.map((group) => [group.id, group])
) as Record<ProfileGroupId, ProfileGroupMeta>;

export type ProfileFieldGroup = {
  id: ProfileGroupId;
  label: string;
  fields: ProfileField[];
};

function getFieldGroupId(key: string): ProfileGroupId {
  const raw = key.toLowerCase();
  const canonical = normalizeProfileKey(key);

  if (canonical === PROFILE_SIGNATURE_KEY || canonical === "unterschrift") {
    return "signature";
  }

  if (
    /wohnungsgeber_nicht|geber_nicht_eigent|nicht_eigentuemer|nicht_eigentümer/.test(
      raw
    )
  ) {
    return "landlord_not_owner";
  }

  if (/wohnungsgeber|vermieter/.test(raw)) {
    return "landlord";
  }

  if (/beauftragt|eigene_person|angaben_zur_eigenen/.test(raw)) {
    return "authorized_person";
  }

  if (/arbeitgeber|beruf|beschaeftig|beschäftig|gehalt/.test(raw)) {
    return "employment";
  }

  if (/telefon|email|e_mail|mail|mobil|fax|handy/.test(raw)) {
    return "contact";
  }

  // Moving: dates/places of move or signature — before generic ort/date rules
  if (isMovingFieldKey(key)) {
    return "moving";
  }

  if (/anmeld|ummeld|einzieh/.test(raw) && !isAddressFieldKey(key)) {
    return "moving";
  }

  // Address: street, number, PLZ, city (residence)
  if (isAddressFieldKey(key)) {
    return "address";
  }

  if (
    /geburts|geschlecht|staat|national|religion|familien|vorname|nachname/.test(
      raw
    ) ||
    canonical === "name"
  ) {
    return "personal";
  }

  if (
    /\bname\b/.test(raw) &&
    !/wohnungsgeber|beauftragt|arbeitgeber|eigentuemer|eigentümer|geber/.test(
      raw
    )
  ) {
    return "personal";
  }

  return "other";
}

/** @deprecated Use getFieldDisplayLabel from field-keys */
export function getFieldLabelInGroup(
  key: string,
  _groupId: ProfileGroupId
): string {
  return getFieldDisplayLabel(key);
}

export function groupProfileFields(fields: ProfileField[]): ProfileFieldGroup[] {
  const buckets = new Map<ProfileGroupId, ProfileField[]>();
  const seenCanonical = new Set<string>();

  for (const field of fields) {
    const canonical = normalizeProfileKey(field.key);
    const groupId = getFieldGroupId(field.key);
    const bucketKey = `${groupId}:${canonical}`;

    if (seenCanonical.has(bucketKey)) continue;
    seenCanonical.add(bucketKey);

    const bucket = buckets.get(groupId) ?? [];
    bucket.push(field);
    buckets.set(groupId, bucket);
  }

  return PROFILE_GROUPS.filter((group) => buckets.has(group.id))
    .map((group) => ({
      id: group.id,
      label: group.label,
      fields: sortFieldsInGroup(
        buckets.get(group.id) ?? [],
        group.id
      ) as ProfileField[],
    }))
    .sort((a, b) => GROUP_BY_ID[a.id].order - GROUP_BY_ID[b.id].order);
}
