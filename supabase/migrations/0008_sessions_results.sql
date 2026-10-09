-- 0008_sessions_results.sql
-- Dr.Tech.Care: Exercise Sessions, Rep Events, Quiz Attempts & Answers

create table public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  client_session_id uuid not null unique,
  entry_id uuid references public.schedule_entries(id) on delete set null,
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  kiosk_id uuid references public.kiosk_devices(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  sets_completed smallint not null default 0,
  total_reps int not null default 0,
  good_reps int not null default 0,
  bad_reps int not null default 0,
  avg_score numeric(5,2),
  best_rom_deg real,
  pain_before smallint check (pain_before between 0 and 10),
  pain_after smallint check (pain_after between 0 and 10),
  ai_mode text not null check (ai_mode in ('pose', 'manual')),
  model_version text,
  avg_fps real,
  stopped_reason text check (stopped_reason in ('completed', 'patient_stopped', 'pain', 'no_person', 'error')),
  summary jsonb not null default '{}'
);

create index on public.exercise_sessions(patient_id, started_at desc);
create index on public.exercise_sessions(exercise_id);
create index on public.exercise_sessions(client_session_id);

create table public.rep_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.exercise_sessions(id) on delete cascade,
  set_no smallint not null,
  rep_no smallint not null,
  is_good boolean not null,
  score smallint not null check (score between 0 and 100),
  peak_angle real,
  duration_ms int,
  issues text[] not null default '{}',
  occurred_at timestamptz not null
);

create index on public.rep_events(session_id);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  client_attempt_id uuid not null unique,
  entry_id uuid references public.schedule_entries(id) on delete set null,
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  quiz_set_id uuid not null references public.quiz_sets(id),
  kiosk_id uuid references public.kiosk_devices(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  score smallint not null default 0,
  total smallint not null default 0,
  answer_mode text not null
);

create index on public.quiz_attempts(patient_id, started_at desc);
create index on public.quiz_attempts(client_attempt_id);

create table public.quiz_answers (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id),
  chosen_index smallint,
  is_correct boolean not null,
  response_ms int,
  primary key (attempt_id, question_id)
);
