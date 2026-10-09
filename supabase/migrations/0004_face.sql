-- 0004_face.sql
-- Dr.Tech.Care: Face Consents, 128-d Vector Embeddings & Face Workflow TTL Tables

create table public.face_consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(profile_id) on delete set null,
  text_version text not null,
  text_sha256 text not null,
  kiosk_id uuid references public.kiosk_devices(id),
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create index on public.face_consents(patient_id);

create table public.face_embeddings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  pose public.face_pose not null,
  embedding extensions.vector(128) not null,
  quality real not null check (quality between 0 and 1),
  model_version text not null,
  created_at timestamptz not null default now()
);

create index face_embeddings_hnsw on public.face_embeddings using hnsw (embedding extensions.vector_l2_ops);
create index on public.face_embeddings(patient_id);

-- Ephemeral Face Workflow Tables (TTL-bound, Service Role Only)
create table public.face_challenges (
  id uuid primary key default gen_random_uuid(),
  kiosk_id uuid references public.kiosk_devices(id),
  purpose text not null check (purpose in ('register', 'login', 'bind')),
  nonce_hash text not null,
  pose_order public.face_pose[] not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index on public.face_challenges(expires_at) where used_at is null;

create table public.face_candidates (
  id uuid primary key default gen_random_uuid(),
  kiosk_id uuid references public.kiosk_devices(id),
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  attempt_no int not null default 1,
  excluded_patient_ids uuid[] not null default '{}',
  expires_at timestamptz not null,
  used_at timestamptz
);

create index on public.face_candidates(expires_at) where used_at is null;

create table public.face_enrollment_drafts (
  id uuid primary key default gen_random_uuid(),
  kiosk_id uuid references public.kiosk_devices(id),
  consent_id uuid references public.face_consents(id),
  embeddings jsonb not null,
  expires_at timestamptz not null
);

create index on public.face_enrollment_drafts(expires_at);

create table public.face_bind_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  kiosk_id uuid references public.kiosk_devices(id),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index on public.face_bind_requests(expires_at) where used_at is null;
