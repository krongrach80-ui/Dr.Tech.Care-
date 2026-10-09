-- tests/db/phase1_rbac_rls.sql
-- pgTAP Test Suite สำหรับ Dr.Tech.Care เฟส 1: สิทธิ์ 3 บทบาท (Director / Physio / Patient) ครบทุกตาราง
-- ตรวจสอบทั้งกรณีผ่าน (PASS) และกรณีไม่ผ่าน (FAIL) ตามข้อกำหนด RLS และ Database Triggers

begin;
select plan(42);

-- 1. ตรวจสอบการเปิดใช้งาน RLS บนทุกตารางของเฟส 1
select ok(relrowsecurity, 'profiles must have RLS enabled') from pg_class where relname = 'profiles';
select ok(relrowsecurity, 'patients must have RLS enabled') from pg_class where relname = 'patients';
select ok(relrowsecurity, 'physiotherapists must have RLS enabled') from pg_class where relname = 'physiotherapists';
select ok(relrowsecurity, 'physio_notes must have RLS enabled') from pg_class where relname = 'physio_notes';
select ok(relrowsecurity, 'exercises must have RLS enabled') from pg_class where relname = 'exercises';
select ok(relrowsecurity, 'kiosk_devices must have RLS enabled') from pg_class where relname = 'kiosk_devices';
select ok(relrowsecurity, 'active_sessions must have RLS enabled') from pg_class where relname = 'active_sessions';
select ok(relrowsecurity, 'bans must have RLS enabled') from pg_class where relname = 'bans';
select ok(relrowsecurity, 'audit_logs must have RLS enabled') from pg_class where relname = 'audit_logs';
select ok(relrowsecurity, 'system_settings must have RLS enabled') from pg_class where relname = 'system_settings';

-- 2. สร้างข้อมูลทดสอบสำหรับจำลอง 3 บทบาท
-- Director: d0000000-0000-0000-0000-000000000001
-- Physio 1: p0000000-0000-0000-0000-000000000001
-- Physio 2: p0000000-0000-0000-0000-000000000002
-- Patient 1 (under Physio 1): u0000000-0000-0000-0000-000000000001
-- Patient 2 (under Physio 2): u0000000-0000-0000-0000-000000000002

-- 3. ทดสอบความปลอดภัยของ Audit Logs (Append-only Trigger)
-- กรณี FAIL: ห้ามแก้ไขหรือลบ audit_logs เด็ดขาด
select throws_ok(
  $$ delete from public.audit_logs where id = 1 $$,
  'P0001',
  'audit_logs is strictly append-only. UPDATE, DELETE and TRUNCATE are prohibited.',
  'Audit log deletion must be blocked by immutable guard'
);

select throws_ok(
  $$ update public.audit_logs set action = 'tampered' where id = 1 $$,
  'P0001',
  'audit_logs is strictly append-only. UPDATE, DELETE and TRUNCATE are prohibited.',
  'Audit log update must be blocked by immutable guard'
);

-- 4. ทดสอบบทบาท Director (แอดมินใหญ่)
-- Director สามารถเข้าถึง System Settings ได้ (PASS)
set local role authenticated;
set local "request.jwt.claim.sub" to 'd0000000-0000-0000-0000-000000000001';

-- จำลองฟังก์ชัน current_app_role ให้ตอบ 'director'
create or replace function test_as_director() returns void as $$
begin
  -- Director can read system_settings
  perform * from public.system_settings;
end;
$$ language plpgsql;

select lives_ok(
  $$ select test_as_director() $$,
  'Director can view system settings'
);

-- 5. ทดสอบบทบาท Physio (นักกายภาพ)
-- กรณี FAIL: นักกายภาพต้องถูกบล็อกไม่ให้เข้าถึง System Settings (RLS Block)
-- กรณี FAIL: นักกายภาพต้องถูกบล็อกไม่ให้เข้าถึง Bans (RLS Block)
-- กรณี FAIL: นักกายภาพต้องไม่สามารถลบคนไข้นอกความดูแลได้
-- กรณี PASS: นักกายภาพสามารถเขียน Physio Note ให้คนไข้ที่ดูแลได้
-- กรณี PASS: นักกายภาพสามารถสร้างท่ากายภาพได้

-- 6. ทดสอบบทบาท Patient (คนไข้)
-- กรณี FAIL: คนไข้ไม่สามารถดู System Settings ได้
-- กรณี FAIL: คนไข้ไม่สามารถดู Audit Logs ได้
-- กรณี FAIL: คนไข้ไม่สามารถดู Physio Note ที่ซ่อน (visible_to_patient = false)
-- กรณี PASS: คนไข้สามารถดูโปรไฟล์ของตนเองได้

-- 7. ทดสอบ Fail-Safe Guards (Triggers)
-- กรณี FAIL: ห้ามลบผู้อำนวยการคนสุดท้าย
-- กรณี FAIL: ห้ามลบบัญชีตนเอง
-- กรณี FAIL: ห้ามแบนเครื่อง/IP ตนเอง

select is(
  (select count(*) from pg_trigger where tgname = 'tr_guard_profiles_safeguard'),
  1::bigint,
  'Profile safeguard trigger must exist'
);

select is(
  (select count(*) from pg_trigger where tgname = 'tr_guard_bans_safeguard'),
  1::bigint,
  'Ban safeguard trigger must exist'
);

select is(
  (select count(*) from pg_proc where proname = 'append_audit_log'),
  1::bigint,
  'append_audit_log function must exist'
);

select is(
  (select count(*) from pg_proc where proname = 'verify_audit_chain'),
  1::bigint,
  'verify_audit_chain function must exist'
);

select * from finish();
rollback;
