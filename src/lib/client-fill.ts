import { getAddressKeyPrefix } from "@/lib/field-autocomplete";
import {
  isExcludedPdfMapping,
  normalizeProfileKey,
  profileHasCanonicalField,
  getStreetLineFromProfile,
} from "@/lib/field-keys";
import {
  resolveMultiProfileValue,
  type ProfileMultiStore,
} from "@/lib/profile-multi";
import type { ProfileSelections } from "@/lib/profile-selections";
import { formatProfileValue } from "@/lib/field-types";
import {
  expandScheduleToPdfMappings,
  isElterngeldScheduleField,
  parseElterngeldSchedule,
} from "@/lib/elterngeld-schedule";
import {
  base64ToUint8Array,
  extractPdfFormFieldNames,
  fillPdfDocument,
  uint8ArrayToBase64,
} from "@/lib/pdf-fill-client";
import { PROFILE_SIGNATURE_KEY } from "@/lib/signature";
import { attachPdfFieldsToQuestions } from "@/lib/field-mapping";
import type {
  FillResponse,
  MissingField,
  PdfFieldContext,
  PdfFieldMapping,
  PdfStructureMapping,
  ProfileData,
} from "@/lib/types";

export { attachPdfFieldsToQuestions } from "@/lib/field-mapping";

export async function fetchFieldMappings(options: {
  pdfText: string;
  pdfFieldNames: string[];
  fieldContexts?: PdfFieldContext[];
  requiredFields?: MissingField[];
  fileName?: string;
}): Promise<PdfStructureMapping> {
  const mapRes = await fetch("/api/map-fields", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!mapRes.ok) {
    const err = await mapRes.json();
    throw new Error(err.error ?? "Feldzuordnung fehlgeschlagen");
  }

  return (await mapRes.json()) as PdfStructureMapping;
}

function formatAddressFromProfile(
  profile: ProfileData,
  profileKey: string
): string | null {
  const prefix = getAddressKeyPrefix(profileKey);
  const street = getStreetLineFromProfile(profile, prefix);
  const plz = profile[`${prefix}postleitzahl`]?.trim();
  const ort = profile[`${prefix}ort`]?.trim();

  const parts = [street, [plz, ort].filter(Boolean).join(" ")].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function resolveProfileValue(
  profile: ProfileData,
  profileKey: string,
  multi?: ProfileMultiStore,
  selections?: ProfileSelections
): string | null {
  const familySelection =
    multi && getMultiValueFamilySelection(profileKey, selections);

  const fromMulti = multi
    ? resolveMultiProfileValue(profile, multi, profileKey, familySelection)
    : null;
  if (fromMulti) return fromMulti;

  const direct = profile[profileKey]?.trim();
  if (direct) return direct;

  if (/_adresse$|_anschrift$/.test(profileKey)) {
    const composed = formatAddressFromProfile(profile, profileKey);
    if (composed) return composed;
  }

  const canonical = normalizeProfileKey(profileKey);
  const canonicalDirect = profile[canonical]?.trim();
  if (canonicalDirect) return canonicalDirect;

  const match = Object.entries(profile).find(
    ([key, value]) =>
      (key === profileKey || normalizeProfileKey(key) === canonical) &&
      value?.trim()
  );
  return match?.[1]?.trim() ?? null;
}

function getMultiValueFamilySelection(
  profileKey: string,
  selections?: ProfileSelections
): string | undefined {
  if (!selections) return undefined;
  const canonical = normalizeProfileKey(profileKey);
  if (canonical === "email") return selections.emailId;
  if (canonical === "telefon") return selections.phoneId;
  if (
    canonical === "strasse" ||
    canonical === "postleitzahl" ||
    canonical === "ort"
  ) {
    return selections.addressId;
  }
  return undefined;
}

function formatValueForPdf(profileKey: string, value: string): string {
  const canonical = normalizeProfileKey(profileKey);
  if (/datum/.test(canonical)) {
    return formatProfileValue("date", value);
  }
  return value;
}

export async function fillFormLocally(options: {
  pdfBase64: string;
  pdfText: string;
  profile: ProfileData;
  profileMulti?: ProfileMultiStore;
  profileSelections?: ProfileSelections;
  signature?: string | null;
  fileName?: string;
  cachedMapping?: PdfStructureMapping;
}): Promise<FillResponse> {
  const {
    pdfBase64,
    profile,
    profileMulti,
    profileSelections,
    signature,
    fileName,
    cachedMapping,
  } = options;
  const pdfBytes = base64ToUint8Array(pdfBase64);
  const pdfFieldNames = await extractPdfFormFieldNames(pdfBytes);

  const mapped =
    cachedMapping ??
    (await fetchFieldMappings({
      pdfText: options.pdfText,
      pdfFieldNames,
      fileName,
    }));

  const pdf_field_mappings: PdfFieldMapping[] = [];
  const filled_fields: { label: string; value: string }[] = [];
  const missing: string[] = [];

  for (const item of mapped.mappings) {
    if (isExcludedPdfMapping(item)) continue;

    if (isElterngeldScheduleField(item.profile_key, item.label)) {
      continue;
    }

    const rawValue = resolveProfileValue(
      profile,
      item.profile_key,
      profileMulti,
      profileSelections
    );
    if (!rawValue) {
      if (!profileHasCanonicalField(profile, item.profile_key)) {
        missing.push(item.label);
      }
      continue;
    }

    const value = formatValueForPdf(item.profile_key, rawValue);
    pdf_field_mappings.push({
      pdf_field: item.pdf_field,
      value,
      label: item.label,
    });
    filled_fields.push({ label: item.label, value });
  }

  for (const [profileKey, rawValue] of Object.entries(profile)) {
    if (!rawValue?.trim() || !isElterngeldScheduleField(profileKey)) continue;

    const schedule = parseElterngeldSchedule(rawValue);
    const scheduleMappings = expandScheduleToPdfMappings(
      schedule,
      pdfFieldNames,
      "Elterngeld Bezugszeitraum"
    );

    for (const mapping of scheduleMappings) {
      if (pdf_field_mappings.some((m) => m.pdf_field === mapping.pdf_field)) {
        continue;
      }
      pdf_field_mappings.push(mapping);
      filled_fields.push({
        label: mapping.label,
        value: mapping.value,
      });
    }
  }

  const signatureData =
    signature ?? profile[PROFILE_SIGNATURE_KEY] ?? undefined;

  const filledPdf = await fillPdfDocument({
    pdfBytes,
    mappings: pdf_field_mappings,
    filledFields: filled_fields,
    signatureDataUrl: signatureData,
    signaturePlacement: mapped.signature_placement,
  });

  return {
    title: mapped.title,
    filled_fields,
    missing,
    pdf_field_mappings,
    signature_placement: mapped.signature_placement,
    has_form_fields: mapped.has_form_fields,
    pdf_base64: uint8ArrayToBase64(filledPdf),
  };
}
