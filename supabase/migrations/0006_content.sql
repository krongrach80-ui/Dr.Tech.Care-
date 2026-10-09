-- 0006_content.sql
-- Dr.Tech.Care: Exercises, Quiz Sets & Quiz Questions

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text,
  steps text[] not null default '{}',
  target_muscles text[] not null default '{}',
  suitable_for text,
  recovery_phase text not null default 'any' check (recovery_phase in ('acute', 'subacute', 'chronic', 'maintenance', 'any')),
  default_sets smallint not null default 3 check (default_sets > 0),
  default_reps smallint not null default 10 check (default_reps > 0),
  hold_seconds smallint not null default 0,
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  image_path text,
  video_path text,
  analysis_config jsonb,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.exercises(created_by);
create index on public.exercises(is_active);

create table public.quiz_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'memory' check (category in ('memory', 'attention', 'language', 'calculation', 'general', 'body')),
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  answer_mode text not null default 'touch' check (answer_mode in ('touch', 'gesture')),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index on public.quiz_sets(created_by);
create index on public.quiz_sets(is_active);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_set_id uuid not null references public.quiz_sets(id) on delete cascade,
  position int not null,
  prompt text not null,
  image_path text,
  choices jsonb not null check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) between 2 and 4),
  correct_index smallint not null,
  explanation text,
  time_limit_seconds smallint,
  created_by uuid not null references public.profiles(id),
  check (correct_index >= 0 and correct_index < jsonb_array_length(choices))
);

create index on public.quiz_questions(quiz_set_id, position);
create index on public.quiz_questions(created_by);
