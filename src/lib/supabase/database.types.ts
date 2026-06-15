export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      field_keys: {
        Row: {
          id: number;
          key: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          key: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      form_families: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      form_documents: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          official_id: string | null;
          issuer: string | null;
          jurisdiction_scope: Database["public"]["Enums"]["jurisdiction_scope"];
          jurisdiction_code: string;
          version_date: string | null;
          version_label: string | null;
          language: string;
          storage_bucket: string;
          storage_path: string | null;
          file_hash: string | null;
          file_size_bytes: number | null;
          page_count: number | null;
          is_current: boolean;
          superseded_by: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          title: string;
          official_id?: string | null;
          issuer?: string | null;
          jurisdiction_scope?: Database["public"]["Enums"]["jurisdiction_scope"];
          jurisdiction_code?: string;
          version_date?: string | null;
          version_label?: string | null;
          language?: string;
          storage_bucket?: string;
          storage_path?: string | null;
          file_hash?: string | null;
          file_size_bytes?: number | null;
          page_count?: number | null;
          is_current?: boolean;
          superseded_by?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          title?: string;
          official_id?: string | null;
          issuer?: string | null;
          jurisdiction_scope?: Database["public"]["Enums"]["jurisdiction_scope"];
          jurisdiction_code?: string;
          version_date?: string | null;
          version_label?: string | null;
          language?: string;
          storage_bucket?: string;
          storage_path?: string | null;
          file_hash?: string | null;
          file_size_bytes?: number | null;
          page_count?: number | null;
          is_current?: boolean;
          superseded_by?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_documents_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "form_families";
            referencedColumns: ["id"];
          },
        ];
      };
      user_fields: {
        Row: {
          user_id: string;
          field_key_id: number;
          value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          field_key_id: number;
          value: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          field_key_id?: number;
          value?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_fields_field_key_id_fkey";
            columns: ["field_key_id"];
            isOneToOne: false;
            referencedRelation: "field_keys";
            referencedColumns: ["id"];
          },
        ];
      };
      user_vaults: {
        Row: {
          user_id: string;
          salt: string;
          ciphertext: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          salt: string;
          ciphertext: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          salt?: string;
          ciphertext?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          file_name: string | null;
          status: Database["public"]["Enums"]["application_status"];
          created_at: string;
          completed_at: string | null;
          form_document_id: string | null;
          source_pdf_path: string | null;
          filled_pdf_path: string | null;
          source_file_hash: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          file_name?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          created_at?: string;
          completed_at?: string | null;
          form_document_id?: string | null;
          source_pdf_path?: string | null;
          filled_pdf_path?: string | null;
          source_file_hash?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          file_name?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          created_at?: string;
          completed_at?: string | null;
          form_document_id?: string | null;
          source_pdf_path?: string | null;
          filled_pdf_path?: string | null;
          source_file_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "applications_form_document_id_fkey";
            columns: ["form_document_id"];
            isOneToOne: false;
            referencedRelation: "form_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_accounts: {
        Row: {
          user_id: string;
          stripe_customer_id: string | null;
          form_credits: number;
          free_credits_used: number;
          billing_period_start: string;
          subscription_tier: Database["public"]["Enums"]["subscription_tier"];
          subscription_status: string | null;
          stripe_subscription_id: string | null;
          subscription_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stripe_customer_id?: string | null;
          form_credits?: number;
          free_credits_used?: number;
          billing_period_start?: string;
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"];
          subscription_status?: string | null;
          stripe_subscription_id?: string | null;
          subscription_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          stripe_customer_id?: string | null;
          form_credits?: number;
          free_credits_used?: number;
          billing_period_start?: string;
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"];
          subscription_status?: string | null;
          stripe_subscription_id?: string | null;
          subscription_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_ledger: {
        Row: {
          id: string;
          user_id: string;
          delta: number;
          balance_after: number;
          reason: string;
          application_id: string | null;
          stripe_event_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          delta: number;
          balance_after: number;
          reason: string;
          application_id?: string | null;
          stripe_event_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          delta?: number;
          balance_after?: number;
          reason?: string;
          application_id?: string | null;
          stripe_event_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_ledger_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      download_grants: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "download_grants_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      application_fields: {
        Row: {
          id: string;
          application_id: string;
          field_key_id: number | null;
          label: string;
          value: string | null;
          is_missing: boolean;
          filled_from_profile: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          application_id: string;
          field_key_id?: number | null;
          label: string;
          value?: string | null;
          is_missing?: boolean;
          filled_from_profile?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          application_id?: string;
          field_key_id?: number | null;
          label?: string;
          value?: string | null;
          is_missing?: boolean;
          filled_from_profile?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "application_fields_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_fields_field_key_id_fkey";
            columns: ["field_key_id"];
            isOneToOne: false;
            referencedRelation: "field_keys";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      application_summaries: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          file_name: string | null;
          status: Database["public"]["Enums"]["application_status"];
          created_at: string;
          completed_at: string | null;
          form_document_id: string | null;
          source_pdf_path: string | null;
          filled_pdf_path: string | null;
          source_file_hash: string | null;
          fields_count: number;
          missing_count: number;
        };
        Relationships: [];
      };
      form_document_catalog: {
        Row: {
          id: string;
          family_id: string;
          family_slug: string;
          family_title: string;
          category: string | null;
          title: string;
          official_id: string | null;
          issuer: string | null;
          jurisdiction_scope: Database["public"]["Enums"]["jurisdiction_scope"];
          jurisdiction_code: string;
          version_date: string | null;
          version_label: string | null;
          language: string;
          storage_bucket: string;
          storage_path: string | null;
          file_hash: string | null;
          is_current: boolean;
          superseded_by: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      ensure_field_key: {
        Args: { p_key: string };
        Returns: number;
      };
      find_form_document_by_hash: {
        Args: { p_hash: string };
        Returns: Database["public"]["Tables"]["form_documents"]["Row"];
      };
      get_user_profile_json: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      get_user_profile_detailed: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      list_family_variants: {
        Args: { p_family_id: string };
        Returns: Database["public"]["Views"]["form_document_catalog"]["Row"][];
      };
      upsert_user_profile: {
        Args: { p_user_id: string; p_fields: Json };
        Returns: undefined;
      };
      reset_billing_period_if_needed: {
        Args: { p_user_id: string };
        Returns: Database["public"]["Tables"]["billing_accounts"]["Row"];
      };
      consume_download_credit: {
        Args: { p_user_id: string; p_application_id: string };
        Returns: Json;
      };
    };
    Enums: {
      application_status: "draft" | "completed" | "failed";
      jurisdiction_scope: "eu" | "national" | "state" | "municipal";
      subscription_tier: "free" | "pro";
    };
    CompositeTypes: Record<string, never>;
  };
};
