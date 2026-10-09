-- tests/db/phase3_schedule.sql
-- pgTAP Test Suite for Dr.Tech.Care Phase 3: Schedule RBAC, RLS, Generator & Safeguards
-- Tests all 3 roles: director, physio (scope all & own), patient

begin;
select plan(28);

-- 1. ตรวจสอบตารางและคอลัมน์สำคัญ
select has_table('public', 'schedule_rules', 'ตาราง schedule_rules ต้องมีอยู่จริง');
select has_table('public', 'schedule_entries', 'ตาราง schedule_entries ต้องมีอยู่จริง');
select has_function('public', 'generate_schedule_entries', ARRAY['uuid'], 'ฟังก์ชัน generate_schedule_entries ต้องมีอยู่');
select has_function('public', 'maintenance_mark_missed_schedules_grace', 'ฟังก์ชัน maintenance_mark_missed_schedules_grace ต้องมีอยู่');

-- 2. ตรวจสอบ RLS เปิดใช้งานบนทั้ง 2 ตาราง
select row_level_security_active('public', 'schedule_rules', 'schedule_rules ต้องเปิดใช้งาน RLS');
select row_level_security_active('public', 'schedule_entries', 'schedule_entries ต้องเปิดใช้งาน RLS');

-- เตรียมข้อมูลทดสอบ (Fixtures)
insert into public.profiles (id, username, display_name, role, status)
values
  ('11111111-0000-0000-0000-000000000001', 'dir.test', 'ผู้อำนวยการทดสอบ', 'director', 'active'),
  ('22222222-0000-0000-0000-000000000001', 'phy1.test', 'นักกายภาพที่ 1', 'physio', 'active'),
  ('22222222-0000-0000-0000-000000000002', 'phy2.test', 'นักกายภาพที่ 2', 'physio', 'active'),
  ('33333333-0000-0000-0000-000000000001', 'pat1.test', 'คนไข้ที่ 1', 'patient', 'active'),
  ('33333333-0000-0000-0000-000000000002', 'pat2.test', 'คนไข้ที่ 2', 'patient', 'active');

insert into public.physiotherapists (profile_id, license_no)
values
  ('22222222-0000-0000-0000-000000000001', 'PT-TEST-01'),
  ('22222222-0000-0000-0000-000000000002', 'PT-TEST-02');

-- มอบหมายคนไข้: pat1 ดูแลโดย phy1 | pat2 ดูแลโดย phy2
insert into public.patients (profile_id, hn, first_name, last_name, birth_date, responsible_physio_id)
values
  ('33333333-0000-0000-0000-000000000001', 'HN-001', 'สมศรี', 'มีสุข', '1955-01-01', '22222222-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000002', 'HN-002', 'บุญมา', 'ใจดี', '1960-05-12', '22222222-0000-0000-0000-000000000002');

insert into public.exercises (id, name, summary, steps, target_muscles, created_by)
values
  ('ee000000-0000-0000-0000-000000000001', 'ยกแขนระดับไหล่', 'สรุปท่า', array['ยกแขนขึ้น'], array['หัวไหล่'], '11111111-0000-0000-0000-000000000001');

-- ตั้งค่า physio_scope เป็น 'all' เริ่มต้น
insert into public.system_settings (key, value, updated_by)
values ('access_policy', jsonb_build_object('physio_scope', 'all'), '11111111-0000-0000-0000-000000000001')
on conflict (key) do update set value = jsonb_build_object('physio_scope', 'all');

-- 3. ทดสอบบทบาทผู้อำนวยการ (Director)
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-0000-0000-0000-000000000001';

-- ผู้อำนวยการสร้าง Schedule Rule ให้คนไข้คนใดก็ได้
insert into public.schedule_rules (
  id, patient_id, start_date, end_date, days_of_week, start_time, end_time, kind, exercise_id, created_by
) values (
  'rr000000-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000001',
  '2026-10-12', '2026-10-15', array[1,2,3,4]::smallint[], '09:00', '09:45', 'exercise',
  'ee000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001'
);

select results_eq(
  $$ select count(*)::int from public.schedule_rules where id = 'rr000000-0000-0000-0000-000000000001' $$,
  $$ values(1) $$,
  'ผู้อำนวยการสร้างและมองเห็น schedule_rules ได้สำเร็จ'
);

-- ผู้อำนวยการเรียกฟังก์ชัน generate_schedule_entries
select is(
  public.generate_schedule_entries('rr000000-0000-0000-0000-000000000001'),
  4,
  'generate_schedule_entries สร้างรายการได้ 4 วัน (จันทร์-พฤหัส)'
);

-- ทดสอบ Idempotency: เรียกซ้ำต้องได้ 0 (ไม่สร้างรายการซ้ำ)
select is(
  public.generate_schedule_entries('rr000000-0000-0000-0000-000000000001'),
  0,
  'generate_schedule_entries เรียกซ้ำต้องคืนค่า 0 ไม่สร้างรายการซ้ำ (Idempotent)'
);

-- 4. ทดสอบบทบาทนักกายภาพเมื่อ physio_scope = 'all'
set local "request.jwt.claim.sub" to '22222222-0000-0000-0000-000000000001';

select results_eq(
  $$ select count(*)::int from public.schedule_entries where patient_id = '33333333-0000-0000-0000-000000000001' $$,
  $$ values(4) $$,
  'เมื่อ physio_scope=all นักกายภาพเห็นรายการของคนไข้ได้'
);

-- 5. ทดสอบบทบาทนักกายภาพเมื่อ physio_scope = 'own'
set local "request.jwt.claim.sub" to '11111111-0000-0000-0000-000000000001';
update public.system_settings
set value = jsonb_build_object('physio_scope', 'own')
where key = 'access_policy';

-- phy1 ดูแล pat1 -> ต้องเห็นรายการของ pat1
set local "request.jwt.claim.sub" to '22222222-0000-0000-0000-000000000001';
select results_eq(
  $$ select count(*)::int from public.schedule_entries where patient_id = '33333333-0000-0000-0000-000000000001' $$,
  $$ values(4) $$,
  'เมื่อ physio_scope=own นักกายภาพที่ 1 เห็นรายการของคนไข้ในความดูแลตนเอง'
);

-- phy2 ไม่ได้ดูแล pat1 -> ต้องไม่เห็นรายการของ pat1 (ได้ 0 แถว)
set local "request.jwt.claim.sub" to '22222222-0000-0000-0000-000000000002';
select results_eq(
  $$ select count(*)::int from public.schedule_entries where patient_id = '33333333-0000-0000-0000-000000000001' $$,
  $$ values(0) $$,
  'เมื่อ physio_scope=own นักกายภาพที่ 2 ถูก RLS บล็อก ไม่เห็นรายการของคนไข้ที่ตนไม่ได้ดูแล'
);

-- 6. ทดสอบบทบาทคนไข้ (Patient)
-- pat1 ต้องเห็นเฉพาะรายการของตัวเอง
set local "request.jwt.claim.sub" to '33333333-0000-0000-0000-000000000001';
select results_eq(
  $$ select count(*)::int from public.schedule_entries where patient_id = '33333333-0000-0000-0000-000000000001' $$,
  $$ values(4) $$,
  'คนไข้มองเห็นตารางกายภาพของตนเองได้'
);

-- pat1 พยายามดูรายการของ pat2 -> ต้องไม่ได้ผลลัพธ์
select results_eq(
  $$ select count(*)::int from public.schedule_entries where patient_id = '33333333-0000-0000-0000-000000000002' $$,
  $$ values(0) $$,
  'คนไข้ถูก RLS บล็อก ไม่สามารถสอดแนมตารางของคนไข้อื่นได้'
);

-- pat1 พยายามลบรายการตาราง -> ต้องถูกบล็อก
select throws_ok(
  $$ delete from public.schedule_entries where patient_id = '33333333-0000-0000-0000-000000000001' $$,
  'คนไข้ไม่มีสิทธิ์ลบรายการตารางกายภาพ'
);

-- 7. ทดสอบ Safeguard ป้องกันการลบท่ากายภาพที่ยังอยู่ในตารางนัดหมายอนาคต
set local "request.jwt.claim.sub" to '11111111-0000-0000-0000-000000000001';
select throws_matching(
  $$ delete from public.exercises where id = 'ee000000-0000-0000-0000-000000000001' $$,
  'CANNOT_DELETE_EXERCISE_SCHEDULED_IN_FUTURE',
  'Trigger ต้องปฏิเสธการลบท่ากายภาพที่มีรายการในอนาคต'
);

-- 8. ทดสอบฟังก์ชัน maintenance_mark_missed_schedules_grace
-- เพิ่มรายการในอดีตที่เลย grace 60 นาที
insert into public.schedule_entries (
  patient_id, scheduled_date, start_time, end_time, kind, exercise_id, status, created_by
) values (
  '33333333-0000-0000-0000-000000000001',
  '2026-01-01', '08:00', '08:30', 'exercise', 'ee000000-0000-0000-0000-000000000001', 'planned',
  '11111111-0000-0000-0000-000000000001'
);

select lives_ok(
  $$ select public.maintenance_mark_missed_schedules_grace() $$,
  'ฟังก์ชัน maintenance_mark_missed_schedules_grace ทำงานได้โดยไม่เกิดข้อผิดพลาด'
);

select results_eq(
  $$ select status::text from public.schedule_entries where scheduled_date = '2026-01-01' and start_time = '08:00' $$,
  $$ values('missed'::text) $$,
  'รายการในอดีตที่เลยเวลาและ grace ถูกปรับสถานะเป็น missed สำเร็จ'
);

rollback;
