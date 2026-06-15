"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ensureClientAuthSession } from "@/lib/auth/client-session";
import {
  createVaultRecord,
  encryptBytesWithVaultKey,
  profileToVaultPayload,
  reencryptVaultRecord,
  unlockVaultRecord,
  vaultPayloadToMulti,
  vaultPayloadToProfile,
} from "@/lib/crypto/vault-client";
import {
  clearDeviceVaultKey,
  getOrCreateDeviceVaultKey,
} from "@/lib/crypto/vault-device";
import type { VaultPayload, VaultRecord } from "@/lib/crypto/vault-types";
import {
  EMPTY_PROFILE_MULTI,
  type ProfileMultiStore,
} from "@/lib/profile-multi";
import { vaultPayloadToProfileFields } from "@/lib/vault-profile";
import type { ProfileData, ProfileField } from "@/lib/types";
import { useT } from "@/i18n/client";

type VaultContextValue = {
  isUnlocked: boolean;
  profile: ProfileData;
  profileMulti: ProfileMultiStore;
  profileFields: ProfileField[];
  payload: VaultPayload | null;
  record: VaultRecord | null;
  saveProfile: (
    data: ProfileData,
    multi?: ProfileMultiStore
  ) => Promise<void>;
  clearVault: () => Promise<void>;
  encryptPdfToStorage: (bytes: Uint8Array) => Promise<string>;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error("useVault must be used within VaultProvider");
  }
  return ctx;
}

async function createEmptyVault(deviceKey: string): Promise<{
  record: VaultRecord;
  payload: VaultPayload;
}> {
  const record = await createVaultRecord(deviceKey);
  const payload = await unlockVaultRecord(deviceKey, record);
  return { record, payload };
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [record, setRecord] = useState<VaultRecord | null>(null);
  const [payload, setPayload] = useState<VaultPayload | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vaultKeyRef = useRef<string | null>(null);

  const persistRecord = async (nextRecord: VaultRecord) => {
    const res = await fetch("/api/vault", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record: nextRecord }),
    });
    if (!res.ok) throw new Error("Vault konnte nicht gespeichert werden");
    setRecord(nextRecord);
  };

  const applyVault = useCallback(
    (vaultKey: string, vaultRecord: VaultRecord, vaultPayload: VaultPayload) => {
      vaultKeyRef.current = vaultKey;
      setRecord(vaultRecord);
      setPayload(vaultPayload);
      setError(null);
    },
    []
  );

  const bootstrapVault = useCallback(async () => {
    const session = await ensureClientAuthSession();
    if (!session) {
      throw new Error("Gastsitzung konnte nicht gestartet werden");
    }

    const res = await fetch("/api/vault");
    if (!res.ok) throw new Error("Vault konnte nicht geladen werden");

    const json = await res.json();
    const existingRecord = (json.record ?? null) as VaultRecord | null;
    const deviceKey = getOrCreateDeviceVaultKey();

    if (!existingRecord) {
      const created = await createEmptyVault(deviceKey);
      await persistRecord(created.record);
      applyVault(deviceKey, created.record, created.payload);
      return;
    }

    try {
      const unlocked = await unlockVaultRecord(deviceKey, existingRecord);
      applyVault(deviceKey, existingRecord, unlocked);
    } catch {
      await fetch("/api/vault", { method: "DELETE" });
      clearDeviceVaultKey();
      const freshKey = getOrCreateDeviceVaultKey();
      const created = await createEmptyVault(freshKey);
      await persistRecord(created.record);
      applyVault(freshKey, created.record, created.payload);
    }
  }, [applyVault]);

  useEffect(() => {
    bootstrapVault()
      .catch((err) => {
        console.error(err);
        setError(t("vault.prepareFailed"));
      })
      .finally(() => setIsReady(true));
  }, [bootstrapVault, t]);

  const profile = useMemo(
    () => (payload ? vaultPayloadToProfile(payload) : {}),
    [payload]
  );

  const profileMulti = useMemo(
    () => (payload ? vaultPayloadToMulti(payload) : EMPTY_PROFILE_MULTI),
    [payload]
  );

  const profileFields = useMemo(
    () => (payload ? vaultPayloadToProfileFields(payload) : []),
    [payload]
  );

  const saveProfile = async (
    data: ProfileData,
    multi?: ProfileMultiStore
  ) => {
    if (!record || !vaultKeyRef.current) {
      throw new Error(t("vault.notReady"));
    }

    const nextPayload = profileToVaultPayload(
      data,
      payload ?? undefined,
      multi ?? profileMulti
    );
    const nextRecord = await reencryptVaultRecord(
      vaultKeyRef.current,
      record,
      nextPayload
    );

    await persistRecord(nextRecord);
    setPayload(nextPayload);
  };

  const clearVault = async () => {
    await fetch("/api/vault", { method: "DELETE" });
    clearDeviceVaultKey();
    vaultKeyRef.current = null;
    setRecord(null);
    setPayload(null);
    setIsReady(false);
    await bootstrapVault().finally(() => setIsReady(true));
  };

  const encryptPdfToStorage = async (bytes: Uint8Array) => {
    if (!record || !vaultKeyRef.current) {
      throw new Error(t("vault.notReady"));
    }
    return encryptBytesWithVaultKey(vaultKeyRef.current, record.salt, bytes);
  };

  const value: VaultContextValue = {
    isUnlocked: isReady && !error,
    profile,
    profileMulti,
    profileFields,
    payload,
    record,
    saveProfile,
    clearVault,
    encryptPdfToStorage,
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">{t("vault.preparing")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
}
