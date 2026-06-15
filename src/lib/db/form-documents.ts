import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DbClient = SupabaseClient<Database>;

export type FormDocumentCatalogEntry = {
  id: string;
  family_id: string;
  family_slug: string;
  family_title: string;
  category: string | null;
  title: string;
  official_id: string | null;
  issuer: string | null;
  jurisdiction_scope: "eu" | "national" | "state" | "municipal";
  jurisdiction_code: string;
  version_date: string | null;
  version_label: string | null;
  language: string;
  storage_bucket: string;
  storage_path: string | null;
  file_hash: string | null;
  is_current: boolean;
  superseded_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function findFormDocumentByHash(
  supabase: DbClient,
  fileHash: string
): Promise<FormDocumentCatalogEntry | null> {
  const { data, error } = await supabase
    .from("form_document_catalog")
    .select("*")
    .eq("file_hash", fileHash)
    .order("is_current", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Document hash lookup error:", error);
    return null;
  }

  return data as FormDocumentCatalogEntry | null;
}

export async function fetchFormDocumentCatalog(
  supabase: DbClient,
  options?: { familyId?: string; jurisdictionCode?: string; limit?: number }
): Promise<FormDocumentCatalogEntry[]> {
  let query = supabase
    .from("form_document_catalog")
    .select("*")
    .eq("is_current", true)
    .order("family_title")
    .order("jurisdiction_code");

  if (options?.familyId) {
    query = query.eq("family_id", options.familyId);
  }

  if (options?.jurisdictionCode) {
    query = query.eq("jurisdiction_code", options.jurisdictionCode);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FormDocumentCatalogEntry[];
}

export async function fetchFamilyVariants(
  supabase: DbClient,
  familyId: string
): Promise<FormDocumentCatalogEntry[]> {
  const { data, error } = await supabase.rpc("list_family_variants", {
    p_family_id: familyId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FormDocumentCatalogEntry[];
}

export async function fetchFormFamilyBySlug(
  supabase: DbClient,
  slug: string
) {
  const { data, error } = await supabase
    .from("form_families")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
