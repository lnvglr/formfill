import {
  classifyFieldKey,
  getFreshnessStatus,
  type FreshnessStatus,
  type FreshnessTier,
} from "@/lib/profile-freshness";
import { getFieldDisplayLabel } from "@/lib/field-keys";
import type { VaultPayload } from "@/lib/crypto/vault-types";
import type { ProfileField } from "@/lib/types";

export function vaultPayloadToProfileFields(
  payload: VaultPayload
): ProfileField[] {
  const now = new Date().toISOString();

  return Object.entries(payload.fields).map(([key, value]) => {
    const updated_at = payload.updatedAt[key] ?? now;
    const freshness_tier: FreshnessTier = classifyFieldKey(key);
    const freshness: FreshnessStatus = getFreshnessStatus(key, updated_at);

    return {
      key,
      value,
      created_at: updated_at,
      updated_at,
      freshness,
      freshness_tier,
    };
  });
}

export function getFieldLabel(key: string): string {
  return getFieldDisplayLabel(key);
}
