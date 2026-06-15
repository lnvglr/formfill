-- Zero-knowledge profile storage: one encrypted blob per user (fast read/write, no field metadata leakage).

create table public.user_vaults (
  user_id uuid primary key references auth.users (id) on delete cascade,
  salt text not null,
  ciphertext text not null,
  updated_at timestamptz not null default now()
);

comment on table public.user_vaults is
  'Encrypted profile vault (client-side AES-256-GCM). Server stores opaque ciphertext only.';

alter table public.user_vaults enable row level security;

create policy "Users manage own vault"
  on public.user_vaults
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Applications: allow null/placeholder field values (no PII at rest on server)
alter table public.application_fields
  alter column value drop not null;
