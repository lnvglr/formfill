-- Billing, credits, and download grants for Stripe monetisation

create type public.subscription_tier as enum ('free', 'pro');

create table public.billing_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  form_credits integer not null default 2 check (form_credits >= 0),
  free_credits_used integer not null default 0 check (free_credits_used >= 0),
  billing_period_start date not null default (date_trunc('month', now())::date),
  subscription_tier public.subscription_tier not null default 'free',
  subscription_status text,
  stripe_subscription_id text unique,
  subscription_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.billing_accounts is
  'Per-user billing state: credits, Stripe customer, subscription tier.';

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  application_id uuid references public.applications (id) on delete set null,
  stripe_event_id text,
  created_at timestamptz not null default now()
);

create index credit_ledger_user_id_created_at_idx
  on public.credit_ledger (user_id, created_at desc);

comment on table public.credit_ledger is
  'Audit trail for credit purchases, consumption, and admin adjustments.';

create table public.download_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, application_id)
);

comment on table public.download_grants is
  'Records which application PDFs the user has paid for (or used a credit on).';

-- Auto-create billing account for new users
create or replace function public.handle_new_user_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.billing_accounts (user_id, form_credits)
  values (new.id, 2)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_billing
  after insert on auth.users
  for each row
  execute function public.handle_new_user_billing();

-- Reset monthly free allowance (2 credits) for free-tier users
create or replace function public.reset_billing_period_if_needed(p_user_id uuid)
returns public.billing_accounts
language plpgsql
security invoker
set search_path = public
as $$
declare
  account public.billing_accounts;
  current_period date := date_trunc('month', now())::date;
begin
  select * into account from public.billing_accounts where user_id = p_user_id;
  if not found then
    insert into public.billing_accounts (user_id)
    values (p_user_id)
    returning * into account;
  end if;

  if account.billing_period_start < current_period
     and account.subscription_tier = 'free' then
    update public.billing_accounts
    set
      form_credits = greatest(form_credits, 2),
      free_credits_used = 0,
      billing_period_start = current_period,
      updated_at = now()
    where user_id = p_user_id
    returning * into account;
  end if;

  return account;
end;
$$;

alter table public.billing_accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.download_grants enable row level security;

create policy "Users can view own billing account"
  on public.billing_accounts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own credit ledger"
  on public.credit_ledger for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own download grants"
  on public.download_grants for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.billing_accounts to authenticated;
grant select on public.credit_ledger to authenticated;
grant select on public.download_grants to authenticated;

-- Consume one credit (or allow Pro) and grant download for an application
create or replace function public.consume_download_credit(
  p_user_id uuid,
  p_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account public.billing_accounts;
  current_period date := date_trunc('month', now())::date;
  already_granted boolean;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  select exists(
    select 1 from public.download_grants
    where user_id = p_user_id and application_id = p_application_id
  ) into already_granted;

  if already_granted then
    return jsonb_build_object('granted', true, 'charged', false);
  end if;

  select * into account from public.billing_accounts where user_id = p_user_id;
  if not found then
    insert into public.billing_accounts (user_id) values (p_user_id)
    returning * into account;
  end if;

  if account.billing_period_start < current_period
     and account.subscription_tier = 'free' then
    update public.billing_accounts
    set
      form_credits = greatest(form_credits, 2),
      free_credits_used = 0,
      billing_period_start = current_period,
      updated_at = now()
    where user_id = p_user_id
    returning * into account;
  end if;

  if account.subscription_tier = 'pro'
     and account.subscription_status = 'active' then
    insert into public.download_grants (user_id, application_id)
    values (p_user_id, p_application_id)
    on conflict do nothing;

    return jsonb_build_object(
      'granted', true,
      'charged', false,
      'reason', 'pro_subscription'
    );
  end if;

  if account.form_credits <= 0 then
    return jsonb_build_object(
      'granted', false,
      'charged', false,
      'reason', 'no_credits'
    );
  end if;

  update public.billing_accounts
  set
    form_credits = form_credits - 1,
    free_credits_used = least(free_credits_used + 1, 2),
    updated_at = now()
  where user_id = p_user_id
  returning * into account;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, application_id)
  values (p_user_id, -1, account.form_credits, 'download', p_application_id);

  insert into public.download_grants (user_id, application_id)
  values (p_user_id, p_application_id)
  on conflict do nothing;

  return jsonb_build_object(
    'granted', true,
    'charged', true,
    'credits_remaining', account.form_credits
  );
end;
$$;

grant execute on function public.reset_billing_period_if_needed(uuid) to authenticated;
grant execute on function public.consume_download_credit(uuid, uuid) to authenticated;
