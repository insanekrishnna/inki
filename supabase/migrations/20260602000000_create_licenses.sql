create extension if not exists pgcrypto;

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active',
  max_activations integer not null default 2,
  stripe_customer_id text,
  stripe_payment_link_id text,
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.license_activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  device_id text not null,
  status text not null default 'active',
  app_version text,
  activated_at timestamptz not null default now(),
  last_validated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (license_id, device_id)
);

alter table public.licenses enable row level security;
alter table public.license_activations enable row level security;

create index if not exists license_activations_license_status_idx
  on public.license_activations (license_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_licenses_updated_at on public.licenses;
create trigger set_licenses_updated_at
before update on public.licenses
for each row execute function public.set_updated_at();

drop trigger if exists set_license_activations_updated_at on public.license_activations;
create trigger set_license_activations_updated_at
before update on public.license_activations
for each row execute function public.set_updated_at();
