-- 0018_face_phase4.sql
-- Dr.Tech.Care: Phase 4 Face Biometrics, Vector(128)+HNSW, Challenges, Candidates, Drafts, Bind Requests, match_face RPC & TTL Cleanup
-- Master Prompt Sections 6.5, 7, 9 (Flows A/B/C) & PDPA Compliance

-- 1. ตารางความยินยอม PDPA (face_consents)
create table if not exists public.face_consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(profile_id) on delete set null,
  text_version text not null default '1.0',
  text_sha256 text not null,
  kiosk_id uuid references public.kiosk_devices(id),
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create index if not exists idx_face_consents_patient on public.face_consents(patient_id);
create index if not exists idx_face_consents_accepted on public.face_consents(accepted_at);

-- 2. ตารางเวกเตอร์ชีวมิติใบหน้า 128 มิติ (face_embeddings)
-- ข้อกำหนดความปลอดภัยชีวมิติ: ไม่เก็บภาพถ่าย เก็บเฉพาะตัวเลข vector(128)
create table if not exists public.face_embeddings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  pose public.face_pose not null,
  embedding extensions.vector(128) not null,
  quality real not null check (quality between 0 and 1),
  model_version text not null default 'face-api-ssd-mobilenetv1-v1',
  created_at timestamptz not null default now()
);

-- HNSW Vector Index เพื่อการค้นหาอัตลักษณ์ด้วย Cosine / L2 distance ที่เร็วระดับมิลลิวินาที
create index if not exists face_embeddings_hnsw on public.face_embeddings using hnsw (embedding extensions.vector_l2_ops);
create index if not exists idx_face_embeddings_patient on public.face_embeddings(patient_id);
create index if not exists idx_face_embeddings_pose on public.face_embeddings(pose);

-- 3. ตาราง Server Challenge ชั่วคราว (face_challenges) ป้องกัน Replay Attack
create table if not exists public.face_challenges (
  id uuid primary key default gen_random_uuid(),
  kiosk_id uuid references public.kiosk_devices(id),
  purpose text not null check (purpose in ('register', 'login', 'bind')),
  nonce_hash text not null unique,
  pose_order public.face_pose[] not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_face_challenges_expires on public.face_challenges(expires_at) where used_at is null;

-- 4. ตารางผู้เข้าข่ายการระบุตัวตน (face_candidates)
create table if not exists public.face_candidates (
  id uuid primary key default gen_random_uuid(),
  kiosk_id uuid references public.kiosk_devices(id),
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  attempt_no int not null default 1,
  excluded_patient_ids uuid[] not null default '{}',
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_face_candidates_expires on public.face_candidates(expires_at) where used_at is null;

-- 5. ตารางร่างการลงทะเบียนใบหน้า (face_enrollment_drafts)
create table if not exists public.face_enrollment_drafts (
  id uuid primary key default gen_random_uuid(),
  kiosk_id uuid references public.kiosk_devices(id),
  consent_id uuid references public.face_consents(id) on delete cascade,
  embeddings jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_face_enrollment_drafts_expires on public.face_enrollment_drafts(expires_at);

-- 6. ตารางคำขอผูกใบหน้าโดยเจ้าหน้าที่ (face_bind_requests)
create table if not exists public.face_bind_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  kiosk_id uuid references public.kiosk_devices(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_face_bind_requests_expires on public.face_bind_requests(expires_at) where used_at is null;

-- 7. ฟังก์ชันค้นหาใบหน้า match_face (SERVICE_ROLE ONLY)
-- กฎเหล็กความปลอดภัย: ไม่อนุญาตให้ public, anon หรือ authenticated เรียกใช้โดยตรง
create or replace function public.match_face(
  probe_embedding extensions.vector(128),
  match_threshold float default 0.40,
  match_count int default 5
)
returns table (
  patient_id uuid,
  full_name text,
  hn text,
  distance float,
  confidence float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    fe.patient_id,
    coalesce(pat.first_name || ' ' || pat.last_name, p.display_name) as full_name,
    pat.hn as hn,
    (fe.embedding <=> probe_embedding)::float as distance,
    (1.0 - (fe.embedding <=> probe_embedding))::float as confidence
  from public.face_embeddings fe
  join public.patients pat on pat.profile_id = fe.patient_id
  join public.profiles p on p.id = fe.patient_id
  where p.status = 'active'
    and p.deleted_at is null
    and (fe.embedding <=> probe_embedding) < match_threshold
  order by fe.embedding <=> probe_embedding asc
  limit match_count;
end;
$$;

-- เพิกถอนสิทธิ์เรียกใช้จากบุคคลทั่วไป
revoke execute on function public.match_face(extensions.vector(128), float, int) from public;
revoke execute on function public.match_face(extensions.vector(128), float, int) from anon;
revoke execute on function public.match_face(extensions.vector(128), float, int) from authenticated;

-- มอบสิทธิ์เฉพาะ service_role เท่านั้น
grant execute on function public.match_face(extensions.vector(128), float, int) to service_role;

-- 8. Row-Level Security (RLS) บนทุกตารางของระบบชีวมิติ
alter table public.face_consents enable row level security;
alter table public.face_embeddings enable row level security;
alter table public.face_challenges enable row level security;
alter table public.face_candidates enable row level security;
alter table public.face_enrollment_drafts enable row level security;
alter table public.face_bind_requests enable row level security;

-- นโยบายความปลอดภัยสูงสุด: ไม่มีนโยบาย SELECT บน face_embeddings สำหรับผู้ใช้ทั่วไป
-- ห้าม Client อ่านเวกเตอร์ชีวมิติของตนเองหรือผู้อื่นเด็ดขาด
drop policy if exists "no_select_face_embeddings" on public.face_embeddings;
-- (การไม่สร้าง SELECT policy ให้ authenticated/anon ทำให้ Postgres RLS ปฏิเสธการ SELECT ทั้งหมด ยกเว้น service_role)

-- ผู้ป่วยสามารถดูประวัติความยินยอม (face_consents) ของตนเองได้
drop policy if exists "face_consents_patient_select" on public.face_consents;
create policy "face_consents_patient_select" on public.face_consents for select to authenticated
using (patient_id = auth.uid() or public.current_app_role() = 'director');

-- 9. ฟังก์ชันบำรุงรักษาลบข้อมูลชั่วคราวที่หมดอายุ (TTL Cleanup)
create or replace function public.maintenance_cleanup_expired_face_records()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  deleted_challenges int := 0;
  deleted_candidates int := 0;
  deleted_drafts int := 0;
  deleted_binds int := 0;
begin
  -- ลบ face_challenges ที่หมดอายุ
  delete from public.face_challenges
  where expires_at < now_ts;
  get diagnostics deleted_challenges = row_count;

  -- ลบ face_candidates ที่หมดอายุ
  delete from public.face_candidates
  where expires_at < now_ts;
  get diagnostics deleted_candidates = row_count;

  -- ลบ face_enrollment_drafts ที่หมดอายุ
  delete from public.face_enrollment_drafts
  where expires_at < now_ts;
  get diagnostics deleted_drafts = row_count;

  -- ลบ face_bind_requests ที่หมดอายุ
  delete from public.face_bind_requests
  where expires_at < now_ts;
  get diagnostics deleted_binds = row_count;

  return jsonb_build_object(
    'deleted_challenges', deleted_challenges,
    'deleted_candidates', deleted_candidates,
    'deleted_drafts', deleted_drafts,
    'deleted_bind_requests', deleted_binds,
    'cleaned_at', now_ts
  );
end;
$$;

-- ตั้งเวลา pg_cron ทุก 15 นาที เพื่อลบข้อมูลชั่วคราวที่หมดอายุ
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('drtechcare-cleanup-expired-face');
    perform cron.schedule(
      'drtechcare-cleanup-expired-face',
      '*/15 * * * *',
      'select public.maintenance_cleanup_expired_face_records();'
    );
  end if;
exception when others then
  null;
end;
$$;
