-- supabase/tests/rls_test.sql
-- Dr.Tech.Care: pgTAP Automated RLS and Security Test Suite

begin;
select plan(18);

-- 1. Check pgvector extension exists
select has_extension('vector', 'Extension vector should be installed');

-- 2. Check RLS is enabled on all core tables
select row_level_security_active('public.profiles', 'profiles has RLS enabled');
select row_level_security_active('public.patients', 'patients has RLS enabled');
select row_level_security_active('public.face_embeddings', 'face_embeddings has RLS enabled');
select row_level_security_active('public.audit_logs', 'audit_logs has RLS enabled');
select row_level_security_active('public.exercises', 'exercises has RLS enabled');
select row_level_security_active('public.quiz_sets', 'quiz_sets has RLS enabled');
select row_level_security_active('public.schedule_entries', 'schedule_entries has RLS enabled');
select row_level_security_active('public.exercise_sessions', 'exercise_sessions has RLS enabled');
select row_level_security_active('public.symptom_reports', 'symptom_reports has RLS enabled');
select row_level_security_active('public.system_settings', 'system_settings has RLS enabled');

-- 3. Check Anonymous cannot read profiles
set local role anon;
select throws_ok(
  'select * from public.profiles limit 1',
  null,
  'Anon should not be able to read profiles (or returns 0 rows)'
);

-- 4. Check Anonymous cannot read patients
select is_empty(
  'select * from public.patients',
  'Anon should read 0 rows from patients'
);

-- 5. Check Anonymous cannot read face_embeddings
select is_empty(
  'select * from public.face_embeddings',
  'Anon should read 0 rows from face_embeddings'
);

-- 6. Check Anonymous cannot execute match_face
select throws_ok(
  'select * from public.match_face(array_fill(0.0::float4, array[128])::vector(128))',
  '42501',
  'permission denied for function match_face',
  'Anon must NOT be allowed to execute match_face RPC'
);

-- 7. Test Service Role permissions
reset role;
set local role service_role;
select ok(
  (select count(*) >= 0 from public.profiles),
  'Service role can read profiles for administrative tasks'
);

-- 8. Test face_embeddings secrecy: even authenticated users cannot select face_embeddings
set local role authenticated;
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-000000000003'; -- patient
select is_empty(
  'select * from public.face_embeddings',
  'Authenticated patient CANNOT read any face embeddings'
);

select * from finish();
rollback;
