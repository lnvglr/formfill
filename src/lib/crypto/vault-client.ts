"use client";

import {
  emptyVaultPayload,
  VAULT_PREFIX,
  type VaultPayload,
  type VaultRecord,
} from "@/lib/crypto/vault-types";
import { normalizeProfileData } from "@/lib/field-keys";
import {
  hydrateMultiFromProfile,
  syncProfileFromMulti,
  type ProfileMultiStore,
} from "@/lib/profile-multi";
import type { ProfileData } from "@/lib/types";

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function deriveVaultKey(
  vaultKey: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(vaultKey),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptWithKey(
  key: CryptoKey,
  plaintext: string
): Promise<string> {
  const iv = randomBytes(IV_BYTES);
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    encoder.encode(plaintext)
  );

  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), iv.length);

  return `${VAULT_PREFIX}${bytesToBase64(payload)}`;
}

async function decryptWithKey(
  key: CryptoKey,
  stored: string
): Promise<string> {
  if (!stored.startsWith(VAULT_PREFIX)) {
    throw new Error("Ungültiges Vault-Format");
  }

  const payload = base64ToBytes(stored.slice(VAULT_PREFIX.length));
  const iv = payload.subarray(0, IV_BYTES);
  const ciphertext = payload.subarray(IV_BYTES);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(ciphertext)
  );

  return new TextDecoder().decode(decrypted);
}

export async function createVaultRecord(
  vaultKey: string,
  payload: VaultPayload = emptyVaultPayload()
): Promise<VaultRecord> {
  const saltBytes = randomBytes(SALT_BYTES);
  const salt = bytesToBase64(saltBytes);
  const key = await deriveVaultKey(vaultKey, saltBytes);
  const ciphertext = await encryptWithKey(key, JSON.stringify(payload));

  return { salt, ciphertext };
}

export async function unlockVaultRecord(
  vaultKey: string,
  record: VaultRecord
): Promise<VaultPayload> {
  const saltBytes = base64ToBytes(record.salt);
  const key = await deriveVaultKey(vaultKey, saltBytes);
  const json = await decryptWithKey(key, record.ciphertext);
  const parsed = JSON.parse(json) as VaultPayload;

  if ((parsed.v !== 1 && parsed.v !== 2) || !parsed.fields || !parsed.updatedAt) {
    throw new Error("Vault-Daten beschädigt");
  }

  return parsed;
}

export async function reencryptVaultRecord(
  vaultKey: string,
  record: VaultRecord,
  payload: VaultPayload
): Promise<VaultRecord> {
  const saltBytes = base64ToBytes(record.salt);
  const key = await deriveVaultKey(vaultKey, saltBytes);
  const ciphertext = await encryptWithKey(key, JSON.stringify(payload));

  return { salt: record.salt, ciphertext };
}

export function vaultPayloadToProfile(payload: VaultPayload): ProfileData {
  const multi = hydrateMultiFromProfile(payload.fields, payload.multi);
  return syncProfileFromMulti(payload.fields, multi);
}

export function vaultPayloadToMulti(
  payload: VaultPayload
): ProfileMultiStore {
  return hydrateMultiFromProfile(payload.fields, payload.multi);
}

export function profileToVaultPayload(
  profile: ProfileData,
  previous?: VaultPayload,
  multi?: ProfileMultiStore
): VaultPayload {
  const hydratedMulti = hydrateMultiFromProfile(
    profile,
    multi ?? previous?.multi
  );
  const normalized = normalizeProfileData(
    syncProfileFromMulti(profile, hydratedMulti)
  );
  const now = new Date().toISOString();
  const updatedAt = { ...(previous?.updatedAt ?? {}) };

  for (const key of Object.keys(normalized)) {
    if (previous?.fields[key] !== normalized[key]) {
      updatedAt[key] = now;
    } else if (!updatedAt[key]) {
      updatedAt[key] = now;
    }
  }

  for (const key of Object.keys(previous?.fields ?? {})) {
    if (!(key in normalized)) {
      delete updatedAt[key];
    }
  }

  const hasMultiData =
    hydratedMulti.emails.length > 0 ||
    hydratedMulti.phones.length > 0 ||
    hydratedMulti.addresses.length > 0;

  return {
    v: hasMultiData ? 2 : previous?.v ?? 1,
    fields: normalized,
    updatedAt,
    multi: hasMultiData ? hydratedMulti : undefined,
  };
}

export async function encryptBytesWithVaultKey(
  vaultKey: string,
  saltBase64: string,
  bytes: Uint8Array
): Promise<string> {
  const saltBytes = base64ToBytes(saltBase64);
  const key = await deriveVaultKey(vaultKey, saltBytes);
  const plaintext = bytesToBase64(bytes);
  return encryptWithKey(key, plaintext);
}

export async function decryptBytesWithVaultKey(
  vaultKey: string,
  saltBase64: string,
  stored: string
): Promise<Uint8Array> {
  const saltBytes = base64ToBytes(saltBase64);
  const key = await deriveVaultKey(vaultKey, saltBytes);
  const plaintext = await decryptWithKey(key, stored);
  return base64ToBytes(plaintext);
}
