-- 0002_accounts.sql
-- Dr.Tech.Care: User Accounts, Patients & Physiotherapists

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  username text not null unique check (username ~ '^[a-z0-9._-]{4,32}$'),
  display_name text not null,
  status public.account_status not null default 'active',
  must_change_password boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index on public.profiles(username);
create index on public.profiles(role);
create index on public.profiles(status) where deleted_at is null;

create table public.patients (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date,
  birth_date_is_estimated boolean not null default false,
  sex public.sex_type not null default 'unspecified',
  phone text,
  personal_history text,
  injury_summary text,
  responsible_physio_id uuid references public.profiles(id),
  onboarding_status public.onboarding_status not null default 'pending_face',
  started_at timestamptz not null default now(),
  face_enrolled_at timestamptz,
  created_via text not null check (created_via in ('self_register', 'staff'))
);

create index on public.patients(responsible_physio_id);
create index on public.patients(onboarding_status);

create table public.physiotherapists (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date,
  sex public.sex_type not null default 'unspecified',
  phone text,
  bio text,
  license_no text
);
