import {
  consolidateMissingFields,
} from "@/lib/questionnaire-steps";
import {
  dedupeMissingFieldsByCanonical,
  filterExcludedFormFields,
  normalizeProfileKey,
} from "@/lib/field-keys";
import { shouldSkipProfileQuestion, type ProfileMultiStore } from "@/lib/profile-multi";
import { isRepeatableFieldKey } from "@/lib/repeatable-fields";
import {
  enrichStaleField,
  inferFieldType,
  normalizeMissingFields,
} from "@/lib/field-types";
import { isFieldStale } from "@/lib/profile-freshness";
import type { MissingField, ProfileData, ProfileField } from "@/lib/types";

export function buildQuestionList(
  aiFields: MissingField[],
  profile: ProfileData,
  profileFields: ProfileField[],
  profileMulti?: ProfileMultiStore,
  max = 30
): MissingField[] {
  const staleQuestions: MissingField[] = profileFields
    .filter((field) => isFieldStale(field.key, field.updated_at))
    .map((field) =>
      enrichStaleField(field, inferFieldType(field.key, field.key))
    );

  const aiMissing = consolidateMissingFields(
    dedupeMissingFieldsByCanonical(
      filterExcludedFormFields(
        normalizeMissingFields(aiFields).filter(
          (field) =>
            !shouldSkipProfileQuestion(profile, profileMulti, field.key)
        )
      )
    )
  );

  const combined = consolidateMissingFields([...staleQuestions, ...aiMissing]);
  const seenKeys = new Set<string>();
  const missing_fields: MissingField[] = [];

  for (const field of combined) {
    const dedupeKey = isRepeatableFieldKey(field.key)
      ? field.key
      : normalizeProfileKey(field.key);
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);
    missing_fields.push({
      ...field,
      key: isRepeatableFieldKey(field.key) ? field.key : dedupeKey,
    });
    if (missing_fields.length >= max) break;
  }

  return missing_fields;
}
