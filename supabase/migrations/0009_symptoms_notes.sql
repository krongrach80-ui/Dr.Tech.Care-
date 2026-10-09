-- 0009_symptoms_notes.sql
-- Dr.Tech.Care: Symptom Reports & Physiotherapist Notes

create table public.symptom_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  session_id uuid references public.exercise_sessions(id) on delete set null,
  kiosk_id uuid references public.kiosk_devices(id),
  body_regions text[] not null default '{}',
  severity smallint not null check (severity between 0 and 10),
  red_flags text[] not null default '{}',
  description text,
  status public.symptom_status not null default 'new',
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);

create index on public.symptom_reports(patient_id, created_at desc);
create index on public.symptom_reports(status);

create table public.physio_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null,
  visible_to_patient boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.physio_notes(patient_id, created_at desc);
create index on public.physio_notes(author_id);
