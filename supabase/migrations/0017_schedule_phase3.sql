-- 0017_schedule_phase3.sql
-- Dr.Tech.Care: Phase 3 Physiotherapy Scheduling Engine & Safeguards
-- Timezone: Asia/Bangkok, Idempotent Generation, Grace Period Transitions & Exercise FK Protection

-- 1. ฟังก์ชันสร้างรายการนัดหมายกายภาพ (generate_schedule_entries) เขตเวลา Asia/Bangkok และ Idempotent
create or replace function public.generate_schedule_entries(p_rule_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
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

      if found then
        inserted_count := inserted_count + 1;
      end if;
    end if;

    curr_d := curr_d + interval '1 day';
  end loop;

  return inserted_count;
end;
$$;

-- 2. ฟังก์ชันปรับสถานะรายการที่เลยเวลาเกิน Grace Period 60 นาทีเป็น missed
create or replace function public.maintenance_mark_missed_schedules_grace()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int := 0;
  current_bkk_timestamp timestamp := (now() at time zone 'Asia/Bangkok');
begin
  update public.schedule_entries
  set status = 'missed',
      updated_at = now()
  where status = 'planned'
    and (
      (scheduled_date + coalesce(end_time, start_time) + interval '60 minutes') < current_bkk_timestamp
    );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- ตั้งเวลา pg_cron ทุก 15 นาที
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- เพิกถอน cron เก่าถ้ามี
    perform cron.unschedule('drtechcare-mark-missed-15m');
    -- รันทุก 15 นาที
    perform cron.schedule(
      'drtechcare-mark-missed-15m',
      '*/15 * * * *',
      'select public.maintenance_mark_missed_schedules_grace();'
    );
  end if;
exception when others then
  null;
end;
$$;

-- 3. Trigger ป้องกันการลบท่ากายภาพที่ยังอยู่ในตารางนัดหมายอนาคต
create or replace function public.check_exercise_future_schedules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  future_count int := 0;
  current_bkk_date date := (now() at time zone 'Asia/Bangkok')::date;
  current_bkk_time time := (now() at time zone 'Asia/Bangkok')::time;
begin
  select count(*) into future_count
  from public.schedule_entries
  where exercise_id = old.id
    and status = 'planned'
    and (
      scheduled_date > current_bkk_date
      or (scheduled_date = current_bkk_date and start_time >= current_bkk_time)
    );

  if future_count > 0 then
    raise exception 'CANNOT_DELETE_EXERCISE_SCHEDULED_IN_FUTURE: ท่านี้ยังมีรายการฝึกในอนาคตจำนวน % รายการ กรุณาปิดการใช้งาน (is_active = false) แทนการลบ', future_count;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_scheduled_exercise on public.exercises;
create trigger trg_prevent_delete_scheduled_exercise
before delete on public.exercises
for each row
execute function public.check_exercise_future_schedules();
