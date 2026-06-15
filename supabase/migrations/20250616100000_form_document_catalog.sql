-- =============================================================================
-- Form document catalog + Supabase Storage for templates and filled PDFs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
create type public.jurisdiction_scope as enum (
  'eu',
  'national',
  'state',
  'municipal'
);

comment on type public.jurisdiction_scope is
  'Geographic scope: EU-wide, national (DE), Bundesland, or municipal.';

-- -----------------------------------------------------------------------------
-- 2. Form families — links the same application across regions / versions
-- -----------------------------------------------------------------------------
create table public.form_families (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category text,
  created_at timestamptz not null default now()
);

comment on table public.form_families is
  'Logical application type (e.g. Wohnsitzanmeldung). Regional PDF variants share a family.';

create index form_families_category_idx on public.form_families (category);

-- -----------------------------------------------------------------------------
-- 3. Form documents — unique versioned official PDFs
-- -----------------------------------------------------------------------------
create table public.form_documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.form_families (id) on delete restrict,

  title text not null,
  official_id text,
  issuer text,

  jurisdiction_scope public.jurisdiction_scope not null default 'national',
  jurisdiction_code text not null default 'DE',

  version_date date,
  version_label text,
  language text not null default 'de',

  storage_bucket text not null default 'form-templates',
  storage_path text,
  file_hash text,
  file_size_bytes bigint,
  page_count smallint,

  is_current boolean not null default true,
  superseded_by uuid references public.form_documents (id) on delete set null,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.form_documents is
  'One row per unique official form version (ID + Stand + Bundesland/EU scope).';

comment on column public.form_documents.jurisdiction_code is
  'ISO-like code: DE (bundesweit), DE-BW, DE-BY, EU, etc.';

comment on column public.form_documents.file_hash is
  'SHA-256 of template PDF — used to match user uploads to catalog entries.';

create index form_documents_family_idx on public.form_documents (family_id);
create index form_documents_jurisdiction_idx
  on public.form_documents (jurisdiction_code, is_current);
create index form_documents_hash_idx
  on public.form_documents (file_hash)
  where file_hash is not null;

create unique index form_documents_version_uidx
  on public.form_documents (
    coalesce(official_id, ''),
    jurisdiction_code,
    coalesce(version_date, '1970-01-01'::date)
  );

-- -----------------------------------------------------------------------------
-- 4. Link user applications to catalog + storage paths
-- -----------------------------------------------------------------------------
alter table public.applications
  add column if not exists form_document_id uuid
    references public.form_documents (id) on delete set null,
  add column if not exists source_pdf_path text,
  add column if not exists filled_pdf_path text,
  add column if not exists source_file_hash text;

comment on column public.applications.form_document_id is
  'Matched catalog document, if the uploaded PDF is recognized.';
comment on column public.applications.source_pdf_path is
  'Storage path in user-documents bucket for the uploaded blank PDF.';
comment on column public.applications.filled_pdf_path is
  'Storage path in user-documents bucket for the filled output PDF.';

create index applications_form_document_idx
  on public.applications (form_document_id)
  where form_document_id is not null;

-- Refresh application summaries view with document + storage columns
drop view if exists public.application_summaries;
create view public.application_summaries
with (security_invoker = true) as
select
  a.id,
  a.user_id,
  a.title,
  a.file_name,
  a.status,
  a.created_at,
  a.completed_at,
  a.form_document_id,
  a.source_pdf_path,
  a.filled_pdf_path,
  a.source_file_hash,
  count(af.id) filter (where not af.is_missing)::integer as fields_count,
  count(af.id) filter (where af.is_missing)::integer as missing_count
from public.applications a
left join public.application_fields af on af.application_id = a.id
group by a.id;

grant select on public.application_summaries to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Catalog view (family + document metadata)
-- -----------------------------------------------------------------------------
create or replace view public.form_document_catalog
with (security_invoker = true) as
select
  d.id,
  d.family_id,
  f.slug as family_slug,
  f.title as family_title,
  f.category,
  d.title,
  d.official_id,
  d.issuer,
  d.jurisdiction_scope,
  d.jurisdiction_code,
  d.version_date,
  d.version_label,
  d.language,
  d.storage_bucket,
  d.storage_path,
  d.file_hash,
  d.is_current,
  d.superseded_by,
  d.metadata,
  d.created_at,
  d.updated_at
from public.form_documents d
join public.form_families f on f.id = d.family_id;

-- -----------------------------------------------------------------------------
-- 6. Helpers
-- -----------------------------------------------------------------------------
create or replace function public.find_form_document_by_hash(p_hash text)
returns public.form_documents
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.form_documents
  where file_hash = p_hash
  order by is_current desc, version_date desc nulls last
  limit 1;
$$;

create or replace function public.list_family_variants(p_family_id uuid)
returns setof public.form_document_catalog
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.form_document_catalog
  where family_id = p_family_id
  order by jurisdiction_code, version_date desc nulls last;
$$;

-- -----------------------------------------------------------------------------
-- 7. Row Level Security — catalog tables
-- -----------------------------------------------------------------------------
alter table public.form_families enable row level security;
alter table public.form_documents enable row level security;

create policy "Authenticated users can read form families"
  on public.form_families for select
  to authenticated
  using (true);

create policy "Authenticated users can read form documents"
  on public.form_documents for select
  to authenticated
  using (true);

grant select on public.form_document_catalog to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Storage buckets
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'form-templates',
    'form-templates',
    false,
    52428800,
    array['application/pdf']
  ),
  (
    'user-documents',
    'user-documents',
    false,
    52428800,
    array['application/pdf']
  )
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- form-templates: read-only for authenticated users (catalog PDFs)
create policy "Authenticated users can read form templates"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'form-templates');

-- user-documents: private per user (path: {user_id}/{application_id}/...)
create policy "Users can read own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload own documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 9. Example catalog seed (family + regional variants — templates uploaded later)
-- -----------------------------------------------------------------------------
insert into public.form_families (slug, title, description, category)
values (
  'de-wohnsitzanmeldung',
  'Wohnsitzanmeldung',
  'Anmeldung einer Wohnung beim Einwohnermeldeamt',
  'housing'
)
on conflict (slug) do nothing;

insert into public.form_documents (
  family_id, title, issuer, jurisdiction_scope, jurisdiction_code, version_label, metadata
)
select
  f.id,
  'Wohnsitzanmeldung (Bundeseinheitlich)',
  'Bundesministerium des Innern',
  'national',
  'DE',
  'Muster — Stand variiert je nach Gemeinde',
  '{"note":"Bundesweites Muster"}'::jsonb
from public.form_families f
where f.slug = 'de-wohnsitzanmeldung'
  and not exists (
    select 1 from public.form_documents d
    where d.family_id = f.id and d.jurisdiction_code = 'DE'
  );

insert into public.form_documents (
  family_id, title, issuer, jurisdiction_scope, jurisdiction_code, version_label, metadata
)
select
  f.id,
  'Wohnsitzanmeldung Baden-Württemberg',
  'Land Baden-Württemberg',
  'state',
  'DE-BW',
  'Landesvariante BW',
  '{"bundesland":"Baden-Württemberg"}'::jsonb
from public.form_families f
where f.slug = 'de-wohnsitzanmeldung'
  and not exists (
    select 1 from public.form_documents d
    where d.family_id = f.id and d.jurisdiction_code = 'DE-BW'
  );

insert into public.form_documents (
  family_id, title, issuer, jurisdiction_scope, jurisdiction_code, version_label, metadata
)
select
  f.id,
  'Wohnsitzanmeldung Bayern',
  'Freistaat Bayern',
  'state',
  'DE-BY',
  'Landesvariante BY',
  '{"bundesland":"Bayern"}'::jsonb
from public.form_families f
where f.slug = 'de-wohnsitzanmeldung'
  and not exists (
    select 1 from public.form_documents d
    where d.family_id = f.id and d.jurisdiction_code = 'DE-BY'
  );
