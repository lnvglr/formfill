import { getAddressKeyPrefix } from "@/lib/field-autocomplete";
import { getStreetLineFromProfile, normalizeProfileKey } from "@/lib/field-keys";
import {
  getAddressValuesForSelection,
  resolveMultiProfileValue,
  type ProfileMultiStore,
} from "@/lib/profile-multi";
import {
  buildRepeatableFieldKey,
  parseRepeatableFieldKey,
} from "@/lib/repeatable-fields";
import type { ProfileData, RepeatableGroup } from "@/lib/types";
import type { QuestionnaireStep } from "@/lib/questionnaire-steps";

function isLandlordKey(key: string): boolean {
  return /wohnungsgeber|vermieter|eigentu[eë]mer/.test(key.toLowerCase());
}

function isRepresentativeKey(key: string): boolean {
  return /beauftragt|eigene_person|vertret/.test(key.toLowerCase());
}

/** Whether a field collects data for someone other than the applicant (or an extra person slot). */
export function isSelfFillablePersonField(key: string): boolean {
  if (parseRepeatableFieldKey(key)) return true;

  if (isLandlordKey(key)) return false;
  if (isRepresentativeKey(key)) return true;

  const lower = key.toLowerCase();
  if (/person(?:en)?_\d+_/.test(lower)) return true;
  if (/\bperson\s*[2-9]/.test(lower)) return true;

  return false;
}

export function isSelfFillableQuestionnaireStep(
  step: QuestionnaireStep
): boolean {
  if (step.layout === "repeat") return true;

  if (step.layout === "address" && step.addressKey) {
    return isSelfFillablePersonField(step.addressKey);
  }

  if (step.layout === "fields" || step.layout === "single") {
    return step.fields.some((field) => isSelfFillablePersonField(field.key));
  }

  return false;
}

function applicantFieldKey(fieldKey: string): string {
  const repeatable = parseRepeatableFieldKey(fieldKey);
  if (repeatable) return repeatable.fieldKey;

  const personMatch = fieldKey.match(/person(?:en)?_\d+_(.+)$/i);
  if (personMatch) return personMatch[1];

  if (isRepresentativeKey(fieldKey)) {
    const stripped = fieldKey.replace(/^beauftragter_/i, "");
    return normalizeProfileKey(stripped);
  }

  return normalizeProfileKey(fieldKey);
}

export function resolveApplicantProfileValue(
  profile: ProfileData,
  fieldKey: string,
  multi?: ProfileMultiStore,
  selectedId?: string
): string | null {
  const fromMulti = multi
    ? resolveMultiProfileValue(profile, multi, fieldKey, selectedId)
    : null;
  if (fromMulti) return fromMulti;

  const canonical = applicantFieldKey(fieldKey);

  if (canonical === "strasse") {
    return getStreetLineFromProfile(profile, "") ?? null;
  }

  const direct = profile[canonical]?.trim();
  if (direct) return direct;

  const match = Object.entries(profile).find(
    ([key, value]) =>
      !getAddressKeyPrefix(key) &&
      !isLandlordKey(key) &&
      !isRepresentativeKey(key) &&
      normalizeProfileKey(key) === canonical &&
      value?.trim()
  );
  return match?.[1]?.trim() ?? null;
}

export function hasSelfFillData(
  profile: ProfileData,
  fieldKeys: string[]
): boolean {
  return fieldKeys.some((key) => resolveApplicantProfileValue(profile, key));
}

export function buildSelfFillForRepeatableInstance(
  group: RepeatableGroup,
  index: number,
  profile: ProfileData
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const field of group.fields) {
    const key = buildRepeatableFieldKey(group.id, index, field.key);
    const value = resolveApplicantProfileValue(profile, field.key);
    if (value) result[key] = value;
  }

  return result;
}

export function buildSelfFillForStep(
  step: QuestionnaireStep,
  profile: ProfileData,
  multi?: ProfileMultiStore,
  selectedAddressId?: string
): Record<string, string> {
  if (step.layout === "address" && step.addressKey) {
    if (!isSelfFillablePersonField(step.addressKey)) return {};

    const targetPrefix = getAddressKeyPrefix(step.addressKey);
    if (multi) {
      return getAddressValuesForSelection(
        multi,
        selectedAddressId ?? multi.defaults?.addressId,
        targetPrefix
      );
    }

    const result: Record<string, string> = {};
    const street = getStreetLineFromProfile(profile, "");
    if (street) result[`${targetPrefix}strasse`] = street;

    for (const part of ["postleitzahl", "ort"] as const) {
      const value = profile[part]?.trim();
      if (value) result[`${targetPrefix}${part}`] = value;
    }

    return result;
  }

  const result: Record<string, string> = {};
  for (const field of step.fields) {
    if (!isSelfFillablePersonField(field.key)) continue;
    const value = resolveApplicantProfileValue(profile, field.key);
    if (value) result[field.key] = value;
  }

  return result;
}
