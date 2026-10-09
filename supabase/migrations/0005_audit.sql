-- 0005_audit.sql
-- Dr.Tech.Care: Append-only Audit Log with Cryptographic Hash Chain

create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  category text not null check (category in ('auth', 'data', 'security', 'system')),
  action text not null,
  outcome text not null check (outcome in ('success', 'failure', 'denied')),
  actor_id uuid,
  actor_role public.app_role,
  actor_label text,
  target_table text,
  target_id text,
  changes jsonb,
  kiosk_id uuid,
  device_id uuid,
  ip inet,
  user_agent text,
  metadata jsonb not null default '{}',
  prev_hash text,
  row_hash text not null
);

create index on public.audit_logs(occurred_at desc);
create index on public.audit_logs(actor_id, occurred_at desc);
create index on public.audit_logs(ip, occurred_at desc);
create index on public.audit_logs(action, occurred_at desc);

-- กฎเหล็ก: Append-only ห้ามแก้ไข ลบ หรือ Truncate ทุกกรณี
create or replace function public.audit_logs_immutable_guard()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs is strictly append-only. UPDATE, DELETE and TRUNCATE are prohibited.';
end;
$$;

create trigger tr_audit_logs_no_modify
before update or delete on public.audit_logs
for each row execute function public.audit_logs_immutable_guard();

create trigger tr_audit_logs_no_truncate
before truncate on public.audit_logs
for each statement execute function public.audit_logs_immutable_guard();

-- ฟังก์ชันเขียนบันทึก Audit ผ่าน Hash Chain (Security Definer)
create or replace function public.append_audit_log(
  p_category text,
  p_action text,
  p_outcome text,
  p_actor_id uuid,
  p_actor_role public.app_role,
  p_actor_label text,
  p_target_table text,
  p_target_id text,
  p_changes jsonb,
  p_kiosk_id uuid,
  p_device_id uuid,
  p_ip inet,
  p_user_agent text,
  p_metadata jsonb default '{}'
) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_prev_hash text;
  v_payload text;
  v_row_hash text;
  v_id bigint;
begin
  -- Serializes chain using transaction advisory lock
  perform pg_advisory_xact_lock(hashtext('audit_chain'));

  select row_hash into v_prev_hash
  from public.audit_logs
  order by id desc limit 1;

  v_payload := coalesce(v_prev_hash, '') ||
               p_category || '|' ||
               p_action || '|' ||
               p_outcome || '|' ||
               coalesce(p_actor_id::text, '') || '|' ||
               coalesce(p_target_table, '') || '|' ||
               coalesce(p_target_id, '') || '|' ||
               coalesce(p_changes::text, '{}') || '|' ||
               coalesce(p_metadata::text, '{}');

  v_row_hash := encode(digest(v_payload, 'sha256'), 'hex');

  insert into public.audit_logs (
    category, action, outcome,
    actor_id, actor_role, actor_label,
    target_table, target_id, changes,
    kiosk_id, device_id, ip, user_agent,
    metadata, prev_hash, row_hash
  ) values (
    p_category, p_action, p_outcome,
    p_actor_id, p_actor_role, p_actor_label,
    p_target_table, p_target_id, p_changes,
    p_kiosk_id, p_device_id, p_ip, p_user_agent,
    coalesce(p_metadata, '{}'), v_prev_hash, v_row_hash
  ) returning id into v_id;

  return v_id;
end;
$$;

-- ฟังก์ชันตรวจสอบความถูกต้องของ Hash Chain (Verify Chain)
create or replace function public.verify_audit_chain(p_from_id bigint default 1, p_to_id bigint default null)
returns table (is_valid boolean, first_broken_id bigint, message text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  r record;
  v_expected_prev_hash text := null;
  v_payload text;
  v_recalculated_hash text;
begin
  for r in
    select * from public.audit_logs
    where id >= p_from_id and (p_to_id is null or id <= p_to_id)
    order by id asc
  loop
    -- Check chain continuity
    if r.id > 1 and r.prev_hash is distinct from v_expected_prev_hash then
      return query select false, r.id, 'Hash chain broken: prev_hash does not match previous row_hash';
      return;
    end if;

    -- Recalculate hash
    v_payload := coalesce(r.prev_hash, '') ||
                 r.category || '|' ||
                 r.action || '|' ||
                 r.outcome || '|' ||
                 coalesce(r.actor_id::text, '') || '|' ||
                 coalesce(r.target_table, '') || '|' ||
                 coalesce(r.target_id, '') || '|' ||
                 coalesce(r.changes::text, '{}') || '|' ||
                 coalesce(r.metadata::text, '{}');

    v_recalculated_hash := encode(digest(v_payload, 'sha256'), 'hex');

    if r.row_hash <> v_recalculated_hash then
      return query select false, r.id, 'Row hash mismatch: payload data has been altered';
      return;
    end if;

    v_expected_prev_hash := r.row_hash;
  end loop;

  return query select true, null::bigint, 'Audit log chain is completely valid and intact';
end;
$$;

revoke all on public.audit_logs from anon, authenticated;
grant execute on function public.verify_audit_chain to authenticated, service_role;
