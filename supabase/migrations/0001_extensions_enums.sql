-- 0001_extensions_enums.sql
-- Dr.Tech.Care: PostgreSQL Extensions & Base Enums

-- Extensions
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create extension if not exists pg_cron;
exception
  when others then
    raise notice 'pg_cron extension not available or restricted, skipping creation.';
end $$;

-- Enums
create type public.app_role as enum ('director', 'physio', 'patient');
create type public.account_status as enum ('active', 'suspended');
create type public.onboarding_status as enum ('pending_face', 'active', 'suspended');
create type public.sex_type as enum ('male', 'female', 'other', 'unspecified');
create type public.face_pose as enum ('center', 'left', 'right');
create type public.entry_kind as enum ('exercise', 'quiz');
create type public.entry_status as enum ('planned', 'in_progress', 'completed', 'missed', 'cancelled');
create type public.symptom_status as enum ('new', 'acknowledged', 'resolved');
create type public.ban_kind as enum ('device', 'ip', 'account');
