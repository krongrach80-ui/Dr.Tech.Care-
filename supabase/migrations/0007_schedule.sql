-- 0007_schedule.sql
-- Dr.Tech.Care: Recurring Schedule Rules & Daily Schedule Entries

create table public.schedule_rules (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  days_of_week smallint[] not null check (
    days_of_week <@ array[1,2,3,4,5,6,7]::smallint[] and cardinality(days_of_week) > 0
  ),
  start_time time not null,
  end_time time,
  kind public.entry_kind not null,
  exercise_id uuid references public.exercises(id),
  quiz_set_id uuid references public.quiz_sets(id),
  target_sets smallint,
  target_reps smallint,
  hold_seconds smallint,
  difficulty smallint,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (
    (kind = 'exercise' and exercise_id is not null and quiz_set_id is null) or
    (kind = 'quiz' and quiz_set_id is not null and exercise_id is null)
  )
);

create index on public.schedule_rules(patient_id);

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.schedule_rules(id) on delete set null,
  patient_id uuid not null references public.patients(profile_id) on delete cascade,
  scheduled_date date not null,
  start_time time not null,
  end_time time,
  kind public.entry_kind not null,
  exercise_id uuid references public.exercises(id),
  quiz_set_id uuid references public.quiz_sets(id),
  target_sets smallint,
  target_reps smallint,
  hold_seconds smallint,
  difficulty smallint,
  status public.entry_status not null default 'planned',
  cancel_reason text,
  completed_at timestamptz,
  notes text,
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (rule_id, scheduled_date, start_time)
);

create index on public.schedule_entries(patient_id, scheduled_date);
create index on public.schedule_entries(status);

-- ฟังก์ชันสร้างรายการนัดหมายรายวันจากกฎซ้ำ (generate_schedule_entries)
create or replace function public.generate_schedule_entries(p_rule_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  curr_d date;
  iso_dow int;
  inserted_count int := 0;
begin
  select * into r from public.schedule_rules where id = p_rule_id;
  if not found then
    return 0;
  end if;

  curr_d := r.start_date;
  while curr_d <= r.end_date loop
    -- extract isodow: 1=Monday .. 7=Sunday
    iso_dow := extract(isodow from curr_d)::int;

    if iso_dow = any(r.days_of_week) then
      insert into public.schedule_entries (
        rule_id, patient_id, scheduled_date, start_time, end_time,
        kind, exercise_id, quiz_set_id,
        target_sets, target_reps, hold_seconds, difficulty,
        status, notes, created_by
      ) values (
        r.id, r.patient_id, curr_d, r.start_time, r.end_time,
        r.kind, r.exercise_id, r.quiz_set_id,
        r.target_sets, r.target_reps, r.hold_seconds, r.difficulty,
        'planned', r.notes, r.created_by
      )
      on conflict (rule_id, scheduled_date, start_time) do nothing;

      inserted_count := inserted_count + 1;
    end if;

    curr_d := curr_d + interval '1 day';
  end loop;

  return inserted_count;
end;
$$;
