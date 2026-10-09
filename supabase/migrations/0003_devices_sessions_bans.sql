-- 0003_devices_sessions_bans.sql
-- Dr.Tech.Care: Kiosk Devices, Active Sessions & Bans

create table public.kiosk_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  pairing_code_hash text,
  pairing_expires_at timestamptz,
  token_hash text,
  last_seen_at timestamptz,
  last_ip inet,
  user_agent text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index on public.kiosk_devices(token_hash) where status = 'active';

create table public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kiosk_id uuid references public.kiosk_devices(id),
  device_id uuid,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id),
  revoke_reason text
);

create index on public.active_sessions(user_id) where revoked_at is null;
create index on public.active_sessions(kiosk_id) where revoked_at is null;
create index on public.active_sessions(expires_at) where revoked_at is null;

create table public.bans (
  id uuid primary key default gen_random_uuid(),
  kind public.ban_kind not null,
  value text not null,
  reason text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id)
);

create unique index bans_active_uq on public.bans(kind, value) where revoked_at is null;
create index on public.bans(expires_at) where revoked_at is null;
