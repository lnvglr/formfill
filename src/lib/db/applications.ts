import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { findFormDocumentByHash } from "@/lib/db/form-documents";
import { uploadUserPdf } from "@/lib/storage/documents";
import type { FillResponse } from "@/lib/types";

type DbClient = SupabaseClient<Database>;

export type SaveApplicationOptions = {
  fileName?: string;
  sourcePdfBytes?: Uint8Array;
  filledPdfBytes?: Uint8Array;
  sourceFileHash?: string;
  formDocumentId?: string | null;
};

export async function saveApplication(
  supabase: DbClient,
  userId: string,
  result: FillResponse,
  options: SaveApplicationOptions = {}
): Promise<string | null> {
  const {
    fileName,
    sourcePdfBytes,
    filledPdfBytes,
    sourceFileHash,
    formDocumentId: explicitDocumentId,
  } = options;

  let formDocumentId = explicitDocumentId ?? null;

  if (!formDocumentId && sourceFileHash) {
    const matched = await findFormDocumentByHash(supabase, sourceFileHash);
    formDocumentId = matched?.id ?? null;
  }

  const { data: application, error: appError } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      title: result.title,
      file_name: fileName ?? null,
      status: result.missing.length > 0 ? "draft" : "completed",
      completed_at: new Date().toISOString(),
      form_document_id: formDocumentId,
      source_file_hash: sourceFileHash ?? null,
    })
    .select("id")
    .single();

  if (appError || !application) {
    console.error("Application insert error:", appError);
    return null;
  }

  const applicationId = application.id;
  let sourcePdfPath: string | null = null;
  let filledPdfPath: string | null = null;

  if (sourcePdfBytes) {
    sourcePdfPath = await uploadUserPdf(
      supabase,
      userId,
      applicationId,
      "source",
      sourcePdfBytes
    );
  }

  if (filledPdfBytes) {
    filledPdfPath = await uploadUserPdf(
      supabase,
      userId,
      applicationId,
      "filled",
      filledPdfBytes
    );
  }

  if (sourcePdfPath || filledPdfPath) {
    const { error: pathError } = await supabase
      .from("applications")
      .update({
        source_pdf_path: sourcePdfPath,
        filled_pdf_path: filledPdfPath,
      })
      .eq("id", applicationId)
      .eq("user_id", userId);

    if (pathError) {
      console.error("Application path update error:", pathError);
    }
  }

  const rows: Database["public"]["Tables"]["application_fields"]["Insert"][] =
    [];

  for (const [index, field] of result.filled_fields.entries()) {
    rows.push({
      application_id: applicationId,
      label: field.label,
      value: null,
      is_missing: false,
      filled_from_profile: true,
      sort_order: index,
    });
  }

  for (const [index, label] of result.missing.entries()) {
    rows.push({
      application_id: applicationId,
      label,
      value: null,
      is_missing: true,
      sort_order: 1000 + index,
    });
  }

  if (rows.length > 0) {
    const { error: fieldsError } = await supabase
      .from("application_fields")
      .insert(rows);

    if (fieldsError) {
      console.error("Application fields insert error:", fieldsError);
    }
  }

  return applicationId;
}

export async function fetchApplicationSummaries(
  supabase: DbClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("application_summaries")
    .select(
      "id, title, file_name, status, fields_count, missing_count, created_at, form_document_id, filled_pdf_path"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function fetchApplicationWithPaths(
  supabase: DbClient,
  userId: string,
  applicationId: string
) {
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, title, file_name, status, source_pdf_path, filled_pdf_path, form_document_id, created_at"
    )
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
