export type VaultPayload = {
  v: 1;
  fields: Record<string, string>;
  updatedAt: Record<string, string>;
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
