import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  STORAGE_BUCKETS,
  userDocumentPath,
} from "@/lib/storage/paths";

type DbClient = SupabaseClient<Database>;

const ENCRYPTED_PDF_CONTENT_TYPE = "application/octet-stream";

/** Store client-encrypted PDF payload (opaque blob). */
export async function uploadUserPdf(
  supabase: DbClient,
  userId: string,
  applicationId: string,
  kind: "source" | "filled",
  pdfBytes: Uint8Array
): Promise<string | null> {
  const path = userDocumentPath(userId, applicationId, kind);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.userDocuments)
    .upload(path, pdfBytes, {
      contentType: ENCRYPTED_PDF_CONTENT_TYPE,
      upsert: true,
    });

  if (error) {
    console.error(`Storage upload error (${kind}):`, error);
    return null;
  }

  return path;
}

export async function downloadUserPdf(
  supabase: DbClient,
  path: string
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.userDocuments)
    .download(path);

  if (error || !data) {
    console.error("Storage download error:", error);
    return null;
  }

  return new Uint8Array(await data.arrayBuffer());
}

export async function createUserPdfSignedUrl(
  supabase: DbClient,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.userDocuments)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }

  return data.signedUrl;
}

export async function createTemplateSignedUrl(
  supabase: DbClient,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.formTemplates)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    console.error("Template signed URL error:", error);
    return null;
  }

  return data.signedUrl;
}
