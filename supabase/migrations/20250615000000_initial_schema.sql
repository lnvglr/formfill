-- User profile data (key-value fields stored as JSON)
create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Filled form history
create table public.form_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  fields_count integer not null default 0,
  missing_count integer not null default 0,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index form_history_user_id_created_at_idx
  on public.form_history (user_id, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.form_history enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own profile"
  on public.user_profiles for delete
  using (auth.uid() = user_id);

create policy "Users can view own history"
  on public.form_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.form_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own history"
  on public.form_history for delete
  using (auth.uid() = user_id);
