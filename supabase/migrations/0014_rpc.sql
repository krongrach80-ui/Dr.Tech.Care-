-- 0014_rpc.sql
-- Dr.Tech.Care: Vector Search RPC & Strict Security Hardening
-- CRITICAL SECURITY RULE: REVOKE from public/anon/authenticated. Granted ONLY to service_role!

create or replace function public.match_face(
  probe_embedding vector(128),
  match_threshold float default 0.40,
  match_count int default 5
)
returns table (
  profile_id uuid,
  full_name text,
  hn text,
  distance float,
  confidence float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    fe.profile_id,
    coalesce(pat.first_name || ' ' || pat.last_name, p.display_name) as full_name,
    pat.profile_id::text as hn,
    (fe.embedding <=> probe_embedding)::float as distance,
    (1.0 - (fe.embedding <=> probe_embedding))::float as confidence
  from public.face_embeddings fe
  join public.profiles p on p.id = fe.profile_id
  left join public.patients pat on pat.profile_id = fe.profile_id
  where p.status = 'active'
    and p.deleted_at is null
    and (fe.embedding <=> probe_embedding) < match_threshold
  order by fe.embedding <=> probe_embedding asc
  limit match_count;
end;
$$;

-- Revoke all public, anon, and authenticated access
revoke execute on function public.match_face(vector(128), float, int) from public;
revoke execute on function public.match_face(vector(128), float, int) from anon;
revoke execute on function public.match_face(vector(128), float, int) from authenticated;

-- Grant execution ONLY to service_role (Used exclusively by trusted server-side Route Handlers)
grant execute on function public.match_face(vector(128), float, int) to service_role;
