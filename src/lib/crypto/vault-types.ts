import type { ProfileMultiStore } from "@/lib/profile-multi";

export type VaultPayload = {
  v: 1 | 2;
  fields: Record<string, string>;
  updatedAt: Record<string, string>;
  multi?: ProfileMultiStore;
};

export type VaultRecord = {
  salt: string;
  ciphertext: string;
  updated_at?: string;
};

export const VAULT_PREFIX = "ffvault:v1:";

export function emptyVaultPayload(): VaultPayload {
  return { v: 1, fields: {}, updatedAt: {} };
}
