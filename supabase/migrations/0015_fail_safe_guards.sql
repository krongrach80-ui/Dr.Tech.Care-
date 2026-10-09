-- 0015_fail_safe_guards.sql
-- Dr.Tech.Care: Database Fail-Safe Guards (Triggers & System Safeguards)
-- กฎกันพลาด 3 ข้อหลัก:
-- 1. ห้ามลบหรือปิดการใช้งาน ผอ.รพ. (Director) คนสุดท้ายของระบบเด็ดขาด
-- 2. ห้ามลบบัญชีของตนเองโดยตรง
-- 3. ห้ามแบนเครื่องหรือ IP ของตนเองที่กำลังใช้งานอยู่

-- 1. ป้องกันการลบหรือระงับ ผอ.รพ. คนสุดท้าย
create or replace function public.guard_last_director_and_self_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_director_count int;
begin
  -- กฎที่ 1: ห้ามลบบัญชีของตนเอง
  if tg_op = 'DELETE' and old.id = auth.uid() then
    raise exception 'Cannot delete your own account (ห้ามลบบัญชีของตนเอง).';
  end if;

  -- กฎที่ 2: ห้ามลบหรือระงับ ผอ.รพ. คนสุดท้าย
  if (tg_op = 'DELETE' and old.role = 'director') or
     (tg_op = 'UPDATE' and old.role = 'director' and (new.role <> 'director' or new.status <> 'active' or new.deleted_at is not null)) then
    
    select count(*) into active_director_count
    from public.profiles
    where role = 'director'
      and status = 'active'
      and deleted_at is null
      and id <> old.id;

    if active_director_count < 1 then
      raise exception 'Cannot delete or deactivate the last hospital director (ห้ามลบหรือระงับผู้อำนวยการโรงพยาบาลคนสุดท้ายของระบบ).';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists tr_guard_profiles_safeguard on public.profiles;
create trigger tr_guard_profiles_safeguard
before delete or update on public.profiles
for each row
execute function public.guard_last_director_and_self_delete();


-- 2. ป้องกันการแบนเครื่องหรือ IP ของตนเอง
create or replace function public.guard_ban_self_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ตรวจสอบการแบนเครื่องตนเอง (Current active kiosk/device session)
  if new.kind = 'device' then
    if exists (
      select 1 from public.active_sessions
      where user_id = auth.uid()
        and revoked_at is null
        and (device_id::text = new.value or kiosk_id::text = new.value)
    ) then
      raise exception 'Cannot ban your own active device or kiosk (ห้ามแบนเครื่องหรือตู้ที่ตนเองกำลังใช้งานอยู่).';
    end if;
  end if;

  -- ตรวจสอบการแบน IP ของตนเอง
  if new.kind = 'ip' then
    if inet_client_addr() is not null and new.value = inet_client_addr()::text then
      raise exception 'Cannot ban your own current client IP (ห้ามแบน IP ที่ตนเองกำลังเชื่อมต่ออยู่).';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_guard_bans_safeguard on public.bans;
create trigger tr_guard_bans_safeguard
before insert on public.bans
for each row
execute function public.guard_ban_self_target();
