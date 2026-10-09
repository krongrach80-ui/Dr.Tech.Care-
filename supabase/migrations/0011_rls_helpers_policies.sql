-- 0011_rls_helpers_policies.sql
-- Dr.Tech.Care: Row Level Security (RLS) Helper Functions & Security Policies

-- Helper Functions (Security Definer with isolated search_path)
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles
  where id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
$$;

create or replace function public.physio_scope()
returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select value->>'physio_scope' from public.system_settings where key = 'access_policy'),
    'all'
  );
$$;

create or replace function public.can_access_patient(pid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case public.current_app_role()
    when 'director' then true
    when 'physio'   then public.physio_scope() = 'all'
                         or exists (
                           select 1 from public.patients p
                           where p.profile_id = pid and p.responsible_physio_id = auth.uid()
                         )
    when 'patient'  then pid = auth.uid()
    else false end;
$$;

-- Enable RLS on every table
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.physiotherapists enable row level security;
alter table public.kiosk_devices enable row level security;
alter table public.active_sessions enable row level security;
alter table public.bans enable row level security;
alter table public.face_consents enable row level security;
alter table public.face_embeddings enable row level security;
alter table public.face_challenges enable row level security;
alter table public.face_candidates enable row level security;
alter table public.face_enrollment_drafts enable row level security;
alter table public.face_bind_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.exercises enable row level security;
alter table public.quiz_sets enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.schedule_rules enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.exercise_sessions enable row level security;
alter table public.rep_events enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.symptom_reports enable row level security;
alter table public.physio_notes enable row level security;
alter table public.system_settings enable row level security;
alter table public.notifications enable row level security;

-- 1. PROFILES POLICIES
create policy "profiles_select_policy" on public.profiles for select to authenticated
using (
  public.current_app_role() = 'director'
  or id = auth.uid()
  or (public.current_app_role() = 'physio' and (role = 'patient' and public.can_access_patient(id)))
);

create policy "profiles_insert_director" on public.profiles for insert to authenticated
with check (public.current_app_role() = 'director');

create policy "profiles_insert_physio" on public.profiles for insert to authenticated
with check (public.current_app_role() = 'physio' and role = 'patient');

create policy "profiles_update_policy" on public.profiles for update to authenticated
using (
  public.current_app_role() = 'director'
  or id = auth.uid()
  or (public.current_app_role() = 'physio' and role = 'patient' and public.can_access_patient(id))
)
with check (
  -- Physio cannot change someone else to director or change role
  case when public.current_app_role() = 'physio' then role = 'patient' else true end
);

create policy "profiles_delete_policy" on public.profiles for delete to authenticated
using (
  (public.current_app_role() = 'director' and id <> auth.uid())
  or (public.current_app_role() = 'physio' and role = 'patient' and public.can_access_patient(id))
);

-- 2. PATIENTS POLICIES
create policy "patients_select_policy" on public.patients for select to authenticated
using (public.can_access_patient(profile_id));

create policy "patients_insert_policy" on public.patients for insert to authenticated
with check (public.current_app_role() in ('director', 'physio'));

create policy "patients_update_policy" on public.patients for update to authenticated
using (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and public.can_access_patient(profile_id)))
with check (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and public.can_access_patient(profile_id)));

create policy "patients_delete_policy" on public.patients for delete to authenticated
using (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and public.can_access_patient(profile_id)));

-- 3. PHYSIOTHERAPISTS POLICIES
create policy "physios_select_policy" on public.physiotherapists for select to authenticated
using (
  public.current_app_role() in ('director', 'physio')
  or profile_id = (select responsible_physio_id from public.patients where profile_id = auth.uid())
);

create policy "physios_insert_director" on public.physiotherapists for insert to authenticated
with check (public.current_app_role() = 'director');

create policy "physios_update_policy" on public.physiotherapists for update to authenticated
using (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and profile_id = auth.uid()))
with check (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and profile_id = auth.uid()));

create policy "physios_delete_director" on public.physiotherapists for delete to authenticated
using (public.current_app_role() = 'director');

-- 4. EXERCISES & QUIZZES (created_by ownership)
create policy "exercises_select_policy" on public.exercises for select to authenticated
using (
  public.current_app_role() in ('director', 'physio')
  or exists (
    select 1 from public.schedule_entries se
    where se.exercise_id = exercises.id and se.patient_id = auth.uid()
  )
);

create policy "exercises_insert_policy" on public.exercises for insert to authenticated
with check (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and created_by = auth.uid())
);

create policy "exercises_update_policy" on public.exercises for update to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and created_by = auth.uid())
);

create policy "exercises_delete_policy" on public.exercises for delete to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and created_by = auth.uid())
);

-- Quiz sets & Questions
create policy "quiz_sets_select" on public.quiz_sets for select to authenticated
using (
  public.current_app_role() in ('director', 'physio')
  or exists (
    select 1 from public.schedule_entries se
    where se.quiz_set_id = quiz_sets.id and se.patient_id = auth.uid()
  )
);

create policy "quiz_sets_manage" on public.quiz_sets for all to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and created_by = auth.uid())
)
with check (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and created_by = auth.uid())
);

create policy "quiz_questions_select" on public.quiz_questions for select to authenticated
using (public.current_app_role() in ('director', 'physio'));

create policy "quiz_questions_manage" on public.quiz_questions for all to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and created_by = auth.uid())
)
with check (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and created_by = auth.uid())
);

-- 5. SCHEDULE POLICIES
create policy "schedule_rules_manage" on public.schedule_rules for all to authenticated
using (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id)))
with check (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id)));

create policy "schedule_entries_select" on public.schedule_entries for select to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id))
  or patient_id = auth.uid()
);

create policy "schedule_entries_manage" on public.schedule_entries for all to authenticated
using (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id)))
with check (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id)));

-- 6. SESSIONS & RESULTS
create policy "sessions_select" on public.exercise_sessions for select to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id))
  or patient_id = auth.uid()
);

create policy "rep_events_select" on public.rep_events for select to authenticated
using (
  exists (
    select 1 from public.exercise_sessions es
    where es.id = rep_events.session_id and (
      public.current_app_role() = 'director'
      or (public.current_app_role() = 'physio' and public.can_access_patient(es.patient_id))
      or es.patient_id = auth.uid()
    )
  )
);

create policy "quiz_attempts_select" on public.quiz_attempts for select to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id))
  or patient_id = auth.uid()
);

-- 7. SYMPTOMS & NOTES
create policy "symptoms_select" on public.symptom_reports for select to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id))
  or patient_id = auth.uid()
);

create policy "symptoms_insert_patient" on public.symptom_reports for insert to authenticated
with check (patient_id = auth.uid());

create policy "symptoms_update_staff" on public.symptom_reports for update to authenticated
using (public.current_app_role() = 'director' or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id)));

create policy "notes_select" on public.physio_notes for select to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id))
  or (patient_id = auth.uid() and visible_to_patient = true)
);

create policy "notes_manage_staff" on public.physio_notes for all to authenticated
using (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id) and author_id = auth.uid())
)
with check (
  public.current_app_role() = 'director'
  or (public.current_app_role() = 'physio' and public.can_access_patient(patient_id) and author_id = auth.uid())
);

-- 8. SYSTEM SETTINGS (Director Only)
create policy "settings_director_manage" on public.system_settings for all to authenticated
using (public.current_app_role() = 'director')
with check (public.current_app_role() = 'director');

-- 9. NOTIFICATIONS
create policy "notifications_own" on public.notifications for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 10. KIOSK DEVICES, BANS, ACTIVE SESSIONS (Director Only)
create policy "kiosk_devices_director" on public.kiosk_devices for all to authenticated
using (public.current_app_role() = 'director')
with check (public.current_app_role() = 'director');

create policy "bans_director" on public.bans for all to authenticated
using (public.current_app_role() = 'director')
with check (public.current_app_role() = 'director');

create policy "active_sessions_director" on public.active_sessions for all to authenticated
using (public.current_app_role() = 'director' or user_id = auth.uid());

-- 11. FACE EMBEDDINGS & EPHEMERAL TABLES (STRICTEST PRIVILEGE: NO SELECT POLICIES AT ALL)
-- Notice: NO SELECT POLICY for authenticated/anon on face_embeddings, face_challenges,
-- face_candidates, face_enrollment_drafts, face_bind_requests!
-- Accessible exclusively via backend Service Role!
