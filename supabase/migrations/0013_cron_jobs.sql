-- 0013_cron_jobs.sql
-- Dr.Tech.Care: Background Maintenance & Cleanup
-- Automatically marks overdue planned schedules as 'missed' and purges expired drafts/challenges

create or replace function public.maintenance_mark_missed_schedules()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Mark planned entries as missed if scheduled_date is in the past
  update public.schedule_entries
  set status = 'missed',
      updated_at = now()
  where status = 'planned'
    and scheduled_date < current_date;
end;
$$;

create or replace function public.maintenance_purge_expired_tokens()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete face enrollment drafts older than 15 minutes
  delete from public.face_enrollment_drafts
  where expires_at < now();

  -- Delete face challenges older than 5 minutes
  delete from public.face_challenges
  where expires_at < now();

  -- Delete inactive kiosk sessions older than 24 hours
  delete from public.active_sessions
  where expires_at < now();
end;
$$;

-- Schedule jobs with pg_cron if pg_cron is available
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Run midnight every day for marking missed schedules
    perform cron.schedule(
      'drtechcare-mark-missed-schedules',
      '5 0 * * *',
      'select public.maintenance_mark_missed_schedules();'
    );

    -- Run every 10 minutes to clean up expired drafts and challenges
    perform cron.schedule(
      'drtechcare-purge-expired-drafts',
      '*/10 * * * *',
      'select public.maintenance_purge_expired_tokens();'
    );
  end if;
exception when others then
  -- In development or environments where cron schema is locked, keep functions ready for trigger/manual invocation
  null;
end;
$$;
