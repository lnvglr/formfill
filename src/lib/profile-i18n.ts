import type { Translator } from "@/i18n/translate";
import type { FreshnessStatus } from "@/lib/profile-freshness";
import type { ProfileGroupId } from "@/lib/profile-groups";

export function getLocalizedProfileGroupLabel(
  id: ProfileGroupId,
  t: Translator
): string {
  const key = `profile.groups.${id}`;
  const translated = t(key);
  return translated !== key ? translated : id;
}

export function getLocalizedFreshnessLabel(
  status: FreshnessStatus,
  t: Translator
): string {
  const key = `profile.freshness.${status}`;
  const translated = t(key);
  return translated !== key ? translated : status;
}
