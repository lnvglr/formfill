import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { VaultRecord } from "@/lib/crypto/vault-types";

type DbClient = SupabaseClient<Database>;

export async function fetchVaultRecord(
  supabase: DbClient,
  userId: string
): Promise<VaultRecord | null> {
  const { data, error } = await supabase
    .from("user_vaults")
    .select("salt, ciphertext, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    salt: data.salt,
    ciphertext: data.ciphertext,
    updated_at: data.updated_at,
  };
}

export async function upsertVaultRecord(
  supabase: DbClient,
  userId: string,
  record: VaultRecord
): Promise<void> {
  const { error } = await supabase.from("user_vaults").upsert({
    user_id: userId,
    salt: record.salt,
    ciphertext: record.ciphertext,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteVaultRecord(
  supabase: DbClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_vaults")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
