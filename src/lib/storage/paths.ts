import { createHash } from "crypto";

export function hashPdfBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export const STORAGE_BUCKETS = {
  formTemplates: "form-templates",
  userDocuments: "user-documents",
} as const;

export function userDocumentPath(
  userId: string,
  applicationId: string,
  kind: "source" | "filled"
): string {
  return `${userId}/${applicationId}/${kind}.pdf`;
}

export function formTemplatePath(documentId: string): string {
  return `${documentId}.pdf`;
}
