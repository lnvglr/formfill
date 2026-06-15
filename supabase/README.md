# Supabase Migrations

SQL migrations for the Formfill database schema, Row Level Security, storage buckets, and billing logic.

## Applying Migrations

### Option A: Supabase SQL Editor

Run each file in `migrations/` **in chronological order** (by filename timestamp) in the Supabase Dashboard → SQL Editor.

### Option B: Supabase CLI

```bash
# Link to your project (one-time)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

## Migration Overview

| File | Description |
|------|-------------|
| `20250615000000_initial_schema.sql` | Legacy schema (superseded by normalized schema) |
| `20250615100000_normalized_schema.sql` | Core tables: `field_keys`, `user_fields`, `applications`, RLS |
| `20250615200000_profile_created_at.sql` | Profile timestamps |
| `20250616100000_form_document_catalog.sql` | Form catalog, storage buckets, seed data |
| `20250616110000_pii_encryption_note.sql` | Documents planned server-side encryption (app uses client-side vault instead) |
| `20250617100000_user_vaults.sql` | Encrypted vault table; nullable field values |
| `20250618100000_billing_admin.sql` | Billing accounts, credits, Stripe integration RPCs |
| `20250619100000_billing_rls_insert_update.sql` | Billing RLS insert/update policies |

## Storage Buckets

Created by migrations:

- **`form-templates`** — read-only catalog PDFs (public to authenticated users)
- **`user-documents`** — per-user encrypted PDFs (`{user_id}/{application_id}/...`)

## Regenerating TypeScript Types

After schema changes:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF \
  > src/lib/supabase/database.types.ts
```

## Security

All user-scoped tables have RLS policies enforcing `auth.uid() = user_id`. Admin operations use the service role key server-side only — never expose it to the client.

See [SECURITY.md](../SECURITY.md) for the full security model.
