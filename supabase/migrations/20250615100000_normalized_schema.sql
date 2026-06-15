-- =============================================================================
-- Normalized schema: field catalog + user profile rows + per-application rows
-- Replaces user_profiles (jsonb blob) and form_history (jsonb blob)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Field key catalog (surrogate integer IDs — fast joins, no schema migrations)
-- -----------------------------------------------------------------------------
create table public.field_keys (
  id smallserial primary key,
  key text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.field_keys is
  'Canonical field identifiers (e.g. geburtsort, strasse). Keys are stable strings; IDs keep joins compact.';

-- -----------------------------------------------------------------------------
-- 2. User profile — one row per user per field (EAV, not one jsonb blob)
-- -----------------------------------------------------------------------------
create table public.user_fields (
  user_id uuid not null references auth.users (id) on delete cascade,
  field_key_id smallint not null references public.field_keys (id) on delete restrict,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, field_key_id)
);

create index user_fields_user_id_updated_at_idx
  on public.user_fields (user_id, updated_at desc);

comment on table public.user_fields is
  'Canonical reusable profile values. Upsert individual fields without rewriting a whole document.';

-- -----------------------------------------------------------------------------
-- 3. Applications — one row per form the user processes
-- -----------------------------------------------------------------------------
create type public.application_status as enum ('draft', 'completed', 'failed');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  file_name text,
  status public.application_status not null default 'completed',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index applications_user_created_idx
  on public.applications (user_id, created_at desc);

comment on table public.applications is
  'One row per PDF/form submission — the unit of work in the Verlauf tab.';

-- -----------------------------------------------------------------------------
-- 4. Application fields — one row per filled/missing field per application
-- -----------------------------------------------------------------------------
create table public.application_fields (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  field_key_id smallint references public.field_keys (id) on delete set null,
  label text not null,
  value text,
  is_missing boolean not null default false,
  filled_from_profile boolean not null default false,
  sort_order smallint not null default 0
);

create unique index application_fields_app_label_uidx
  on public.application_fields (application_id, label);

create index application_fields_application_id_idx
  on public.application_fields (application_id);

comment on table public.application_fields is
  'Snapshot of each field for a specific application. Historical record even if profile changes later.';

-- -----------------------------------------------------------------------------
-- 5. Helper: resolve or create field key IDs
-- -----------------------------------------------------------------------------
create or replace function public.ensure_field_key(p_key text)
returns smallint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id smallint;
begin
  insert into public.field_keys (key)
  values (p_key)
  on conflict (key) do nothing;

  select id into v_id from public.field_keys where key = p_key;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Helper: bulk upsert profile from jsonb (API convenience, single round-trip)
-- -----------------------------------------------------------------------------
create or replace function public.upsert_user_profile(p_user_id uuid, p_fields jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  entry record;
  v_key_id smallint;
begin
  if p_fields is null or p_fields = '{}'::jsonb then
    return;
  end if;

  for entry in select * from jsonb_each_text(p_fields)
  loop
    v_key_id := public.ensure_field_key(entry.key);

    insert into public.user_fields (user_id, field_key_id, value, updated_at)
    values (p_user_id, v_key_id, entry.value, now())
    on conflict (user_id, field_key_id)
    do update set
      value = excluded.value,
      updated_at = now();
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Helper: profile as jsonb (for AI prompts — assembled at read time)
-- -----------------------------------------------------------------------------
create or replace function public.get_user_profile_json(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(fk.key, uf.value),
    '{}'::jsonb
  )
  from public.user_fields uf
  join public.field_keys fk on fk.id = uf.field_key_id
  where uf.user_id = p_user_id;
$$;

-- -----------------------------------------------------------------------------
-- 8. View: application list with counts (avoids jsonb, uses aggregates)
-- -----------------------------------------------------------------------------
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
  count(af.id) filter (where not af.is_missing)::integer as fields_count,
  count(af.id) filter (where af.is_missing)::integer as missing_count
from public.applications a
left join public.application_fields af on af.application_id = a.id
group by a.id;

-- -----------------------------------------------------------------------------
-- 9. Migrate existing data (if old tables exist), then drop them
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_profiles'
  ) then
    perform public.upsert_user_profile(
      up.user_id,
      up.data
    )
    from public.user_profiles up
    where up.data <> '{}'::jsonb;

    drop table public.user_profiles;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'form_history'
  ) then
    insert into public.applications (id, user_id, title, status, created_at, completed_at)
    select
      fh.id,
      fh.user_id,
      fh.title,
      'completed'::public.application_status,
      fh.created_at,
      fh.created_at
    from public.form_history fh;

    insert into public.application_fields (
      application_id,
      label,
      value,
      is_missing,
      sort_order
    )
    select
      fh.id,
      coalesce(f->>'label', 'Feld'),
      f->>'value',
      false,
      (row_number() over (partition by fh.id order by f.ordinality))::smallint
    from public.form_history fh
    cross join lateral jsonb_array_elements(
      coalesce(fh.result->'filled_fields', '[]'::jsonb)
    ) with ordinality as f(item, ordinality)
    where fh.result is not null;

    insert into public.application_fields (
      application_id,
      label,
      is_missing,
      sort_order
    )
    select
      fh.id,
      m.item #>> '{}',
      true,
      (1000 + row_number() over (partition by fh.id order by m.ordinality))::smallint
    from public.form_history fh
    cross join lateral jsonb_array_elements(
      coalesce(fh.result->'missing', '[]'::jsonb)
    ) with ordinality as m(item, ordinality)
    where fh.result is not null;

    drop table public.form_history;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.field_keys enable row level security;
alter table public.user_fields enable row level security;
alter table public.applications enable row level security;
alter table public.application_fields enable row level security;

-- field_keys: readable by authenticated users (shared catalog)
create policy "Authenticated users can read field keys"
  on public.field_keys for select
  to authenticated
  using (true);

create policy "Authenticated users can insert field keys"
  on public.field_keys for insert
  to authenticated
  with check (true);

create policy "Users can view own fields"
  on public.user_fields for select
  using (auth.uid() = user_id);

create policy "Users can insert own fields"
  on public.user_fields for insert
  with check (auth.uid() = user_id);

create policy "Users can update own fields"
  on public.user_fields for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own fields"
  on public.user_fields for delete
  using (auth.uid() = user_id);

create policy "Users can view own applications"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

create policy "Users can view own application fields"
  on public.application_fields for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_fields.application_id
        and a.user_id = auth.uid()
    )
  );

create policy "Users can insert own application fields"
  on public.application_fields for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_fields.application_id
        and a.user_id = auth.uid()
    )
  );

create policy "Users can delete own application fields"
  on public.application_fields for delete
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_fields.application_id
        and a.user_id = auth.uid()
    )
  );

-- Grant view access (security invoker inherits underlying RLS)
grant select on public.application_summaries to authenticated;
