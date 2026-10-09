-- 0010_settings_notifications.sql
-- Dr.Tech.Care: System Settings & Realtime Notifications

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- Seed ค่าเริ่มต้นของระบบตามตารางในสเปกข้อ 5.8
insert into public.system_settings (key, value) values
('access_policy', '{"physio_scope":"all"}'::jsonb),
('face', '{"distance_threshold":0.50,"ambiguity_margin":0.08,"side_pose_slack":0.10,"min_quality":0.60,"max_embeddings_per_patient":15,"yaw_target_deg":18,"yaw_center_max_deg":8,"challenge_ttl_s":45,"candidate_ttl_s":60,"randomize_pose_order":true}'::jsonb),
('kiosk', '{"idle_timeout_s":45,"idle_warning_s":10,"post_session_logout_s":20}'::jsonb),
('pose', '{"model":"lite","min_visibility":0.6,"smoothing":{"min_cutoff":1.0,"beta":0.007},"target_fps":24,"voice_feedback":true}'::jsonb),
('security', '{"face_fail":{"max":5,"window_s":300,"lock_s":120},"staff_fail":{"max":5,"window_s":600,"lock_s":900},"audit_retention_days":365,"session_max_hours_staff":8}'::jsonb),
('retention', '{"face_embedding_inactive_months":12,"draft_ttl_minutes":15}'::jsonb)
on conflict (key) do nothing;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.notifications(user_id, created_at desc);

-- Realtime Publication for notifications & symptom alerts
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when others then
    raise notice 'supabase_realtime publication not found or restricted, skipping alter publication.';
end $$;
