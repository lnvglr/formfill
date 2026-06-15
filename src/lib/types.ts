export type ProfileData = Record<string, string>;

export type FreshnessTier = "stable" | "slow" | "medium" | "fast";
export type FreshnessStatus = "fresh" | "aging" | "stale";

export type ProfileField = {
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
  freshness: FreshnessStatus;
  freshness_tier: FreshnessTier;
};

export type ProfileResponse = {
  data: ProfileData;
  fields: ProfileField[];
};

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "phone"
  | "email"
  | "address"
  | "name"
  | "number"
  | "combobox"
  | "elterngeld_schedule";

export type MissingField = {
  key: string;
  question: string;
  subquestion?: string;
  info?: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  reason?: "missing" | "stale";
  /** Exact AcroForm field names tied to this question */
  pdf_fields?: string[];
};

export type RepeatableFieldTemplate = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
};

export type RepeatableGroup = {
  id: string;
  question: string;
  subquestion?: string;
  info?: string;
  maxInstances: number;
  startIndex: number;
  required?: boolean;
  fields: RepeatableFieldTemplate[];
};

export type AnalyzeResponse = {
  form_title: string;
  missing_fields: MissingField[];
  repeatable_groups?: RepeatableGroup[];
  matched_document?: {
    id: string;
    title: string;
    family_title: string;
    family_slug: string;
    jurisdiction_code: string;
    version_label: string | null;
    official_id: string | null;
  };
};

export type FilledField = {
  label: string;
  value: string;
};

export type PdfFieldMapping = {
  pdf_field: string;
  value: string;
  label: string;
};

export type SignaturePlacement = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfFieldRect = {
  name: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfFieldContext = {
  pdf_field: string;
  page: number;
  rect: PdfFieldRect;
  nearby_label: string;
};

export type FieldRole =
  | "applicant"
  | "landlord"
  | "representative"
  | "household"
  | "signature_meta"
  | "other";

export type PdfFieldMappingSpec = {
  pdf_field: string;
  profile_key: string;
  label: string;
  role?: FieldRole;
  context?: string;
};

export type PdfStructureMapping = {
  title: string;
  mappings: PdfFieldMappingSpec[];
  signature_placement?: SignaturePlacement;
  has_form_fields: boolean;
};

export type FillResponse = {
  title: string;
  filled_fields: FilledField[];
  missing: string[];
  pdf_field_mappings?: PdfFieldMapping[];
  signature_placement?: SignaturePlacement;
  pdf_base64?: string;
  has_form_fields?: boolean;
  application_id?: string;
  matched_document?: {
    id: string;
    title: string;
    family_title: string;
    jurisdiction_code: string;
    version_label: string | null;
  };
};

export type HistoryItem = {
  id: string;
  title: string;
  file_name: string | null;
  status: "draft" | "completed" | "failed";
  fields_count: number;
  missing_count: number;
  created_at: string;
};
