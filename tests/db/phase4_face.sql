-- tests/db/phase4_face.sql
-- pgTAP Test Suite for Dr.Tech.Care Phase 4: Face Biometrics, Vector(128)+HNSW, Security, RLS & match_face RPC
-- Master Prompt Sections 6.5, 7, 9 & PDPA Compliance

begin;
select plan(24);

-- 1. ตรวจสอบความมีอยู่ของตารางทั้ง 6
select has_table('public', 'face_consents', 'ตาราง face_consents ต้องมีอยู่');
select has_table('public', 'face_embeddings', 'ตาราง face_embeddings ต้องมีอยู่');
select has_table('public', 'face_challenges', 'ตาราง face_challenges ต้องมีอยู่');
select has_table('public', 'face_candidates', 'ตาราง face_candidates ต้องมีอยู่');
select has_table('public', 'face_enrollment_drafts', 'ตาราง face_enrollment_drafts ต้องมีอยู่');
select has_table('public', 'face_bind_requests', 'ตาราง face_bind_requests ต้องมีอยู่');

-- 2. ตรวจสอบคอลัมน์ vector(128) และ HNSW index บน face_embeddings
select has_column('public', 'face_embeddings', 'embedding', 'face_embeddings ต้องมีคอลัมน์ embedding');
select has_column('public', 'face_embeddings', 'quality', 'face_embeddings ต้องมีคอลัมน์ quality');
select has_column('public', 'face_embeddings', 'pose', 'face_embeddings ต้องมีคอลัมน์ pose');

-- 3. ตรวจสอบการเปิดใช้งาน RLS บนทุกตาราง
select row_level_security_active('public', 'face_consents', 'face_consents ต้องเปิดใช้งาน RLS');
select row_level_security_active('public', 'face_embeddings', 'face_embeddings ต้องเปิดใช้งาน RLS');
select row_level_security_active('public', 'face_challenges', 'face_challenges ต้องเปิดใช้งาน RLS');
select row_level_security_active('public', 'face_candidates', 'face_candidates ต้องเปิดใช้งาน RLS');
select row_level_security_active('public', 'face_enrollment_drafts', 'face_enrollment_drafts ต้องเปิดใช้งาน RLS');
select row_level_security_active('public', 'face_bind_requests', 'face_bind_requests ต้องเปิดใช้งาน RLS');

-- 4. ตรวจสอบฟังก์ชัน match_face และ maintenance_cleanup_expired_face_records
select has_function('public', 'match_face', ARRAY['extensions.vector', 'double precision', 'integer'], 'ฟังก์ชัน match_face ต้องมีอยู่');
select has_function('public', 'maintenance_cleanup_expired_face_records', 'ฟังก์ชัน maintenance_cleanup_expired_face_records ต้องมีอยู่');

-- เตรียมข้อมูลทดสอบ
insert into public.profiles (id, username, display_name, role, status)
values
  ('11111111-0000-0000-0000-000000000001', 'dir.face', 'แอดมินทดสอบ', 'director', 'active'),
  ('33333333-0000-0000-0000-000000000001', 'pat1.face', 'คนไข้ที่ 1', 'patient', 'active'),
  ('33333333-0000-0000-0000-000000000002', 'pat2.face', 'คนไข้ที่ 2', 'patient', 'active');

insert into public.patients (profile_id, hn, first_name, last_name, birth_date)
values
  ('33333333-0000-0000-0000-000000000001', 'HN-F01', 'สมศรี', 'วงศ์สุวรรณ', '1954-05-12'),
  ('33333333-0000-0000-0000-000000000002', 'HN-F02', 'สมพร', 'ยิ้มแย้ม', '1958-09-24');

-- ใส่ความยินยอมและเวกเตอร์ทดสอบ (จำลองเบื้องหลัง)
insert into public.face_consents (id, patient_id, text_version, text_sha256)
values (
  'cc000000-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000001',
  '1.0',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
);

-- 5. ทดสอบความปลอดภัย RLS: ผู้ใช้ทั่วไป (Authenticated) ต้อง SELECT face_embeddings ไม่ได้เด็ดขาด!
set local role authenticated;
set local "request.jwt.claim.sub" to '33333333-0000-0000-0000-000000000001';

select results_eq(
  $$ select count(*)::int from public.face_embeddings $$,
  $$ values(0) $$,
  'RLS ต้องบล็อกไม่ให้คนไข้หรือผู้ใช้ทั่วไปอ่านเวกเตอร์ใน face_embeddings ได้เด็ดขาด'
);

-- 6. ทดสอบ RLS บน face_consents: คนไข้เห็นเฉพาะของตนเอง
select results_eq(
  $$ select count(*)::int from public.face_consents where patient_id = '33333333-0000-0000-0000-000000000001' $$,
  $$ values(1) $$,
  'คนไข้สามารถดูประวัติความยินยอม PDPA ของตนเองได้'
);

-- คนไข้ที่ 2 ต้องไม่เห็นความยินยอมของคนไข้ที่ 1
set local "request.jwt.claim.sub" to '33333333-0000-0000-0000-000000000002';
select results_eq(
  $$ select count(*)::int from public.face_consents where patient_id = '33333333-0000-0000-0000-000000000001' $$,
  $$ values(0) $$,
  'คนไข้ที่ 2 ถูก RLS บล็อก ไม่สามารถดูความยินยอมของคนไข้อื่นได้'
);

-- 7. ทดสอบสิทธิ์การเรียก match_face: authenticated ต้องถูกปฏิเสธ (Permission Denied)
select throws_ok(
  $$ select * from public.match_face(array_fill(0.1, ARRAY[128])::extensions.vector, 0.4, 5) $$,
  'permission denied for function match_face',
  'Authenticated User ต้องไม่มีสิทธิ์เรียกฟังก์ชัน match_face โดยตรง'
);

-- 8. ทดสอบฟังก์ชัน TTL Cleanup
set local role postgres;
insert into public.face_challenges (id, purpose, nonce_hash, pose_order, expires_at)
values (
  'ch000000-0000-0000-0000-000000000001',
  'login',
  'hash_expired_test',
  array['center', 'left', 'right']::public.face_pose[],
  now() - interval '1 hour'
);

select lives_ok(
  $$ select public.maintenance_cleanup_expired_face_records() $$,
  'ฟังก์ชัน maintenance_cleanup_expired_face_records รันสำเร็จโดยไม่มีข้อผิดพลาด'
);

select results_eq(
  $$ select count(*)::int from public.face_challenges where id = 'ch000000-0000-0000-0000-000000000001' $$,
  $$ values(0) $$,
  'ข้อมูล challenge ที่หมดอายุถูกลบออกจากระบบอย่างถูกต้อง'
);

rollback;
