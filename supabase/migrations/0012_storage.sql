-- 0012_storage.sql
-- Dr.Tech.Care: Storage Buckets & Policies
-- CRITICAL SECURITY RULE: No bucket for face images/videos. Biometrics stored strictly as 128-d vectors in PostgreSQL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('exercise-media', 'exercise-media', true, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']),
  ('reports', 'reports', false, 10485760, array['application/pdf', 'application/json', 'text/csv'])
on conflict (id) do nothing;

-- Storage RLS
-- exercise-media: Public read for kiosk and staff; Insert/Update/Delete only for staff (director & physio)
create policy "exercise_media_read" on storage.objects for select
using (bucket_id = 'exercise-media');

create policy "exercise_media_write" on storage.objects for insert to authenticated
with check (
  bucket_id = 'exercise-media'
  and public.current_app_role() in ('director', 'physio')
);

create policy "exercise_media_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'exercise-media'
  and public.current_app_role() in ('director', 'physio')
);

-- reports: Strictly private. Only director or responsible physio can read/write reports
create policy "reports_read" on storage.objects for select to authenticated
using (
  bucket_id = 'reports'
  and public.current_app_role() in ('director', 'physio')
);

create policy "reports_write" on storage.objects for insert to authenticated
with check (
  bucket_id = 'reports'
  and public.current_app_role() in ('director', 'physio')
);
