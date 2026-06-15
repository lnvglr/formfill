"use client";

const DEVICE_KEY_STORAGE = "formfill_device_vault_key_v1";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Per-device secret used to encrypt the vault without user interaction. */
export function getOrCreateDeviceVaultKey(): string {
  if (typeof window === "undefined") {
    throw new Error("Device vault key is only available in the browser");
  }

  const existing = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (existing) return existing;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = bytesToBase64(bytes);
  localStorage.setItem(DEVICE_KEY_STORAGE, key);
  return key;
}

export function clearDeviceVaultKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEVICE_KEY_STORAGE);
}
