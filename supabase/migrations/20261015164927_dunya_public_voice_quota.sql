-- Only the server can consume quotas. No identity, transcript, audio or raw IP is stored.
create table if not exists public.dunya_voice_rate_limits (
  quota_key text not null,
  window_seconds integer not null,
  bucket_start timestamptz not null,
  used integer not null default 0,
  primary key (quota_key, window_seconds, bucket_start)
);
alter table public.dunya_voice_rate_limits enable row level security;
revoke all on public.dunya_voice_rate_limits from public, anon, authenticated;
create index if not exists dunya_voice_quota_cleanup on public.dunya_voice_rate_limits(bucket_start);

create or replace function public.consume_dunya_voice_quota(p_key text, p_limit integer, p_window integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  bucket timestamptz;
  consumed integer;
begin
  if length(p_key) > 128 or length(p_key) < 1 or p_limit < 1 or p_limit > 10000 or p_window not in (60, 86400) then
    raise exception 'Invalid quota';
  end if;
  bucket := date_bin(make_interval(secs => p_window), clock_timestamp(), timestamptz '1970-01-01');
  delete from public.dunya_voice_rate_limits where bucket_start < clock_timestamp() - interval '2 days';
  insert into public.dunya_voice_rate_limits as q(quota_key, window_seconds, bucket_start, used)
  values (p_key, p_window, bucket, 1)
  on conflict (quota_key, window_seconds, bucket_start) do update set used = q.used + 1
  where q.used < p_limit returning used into consumed;
  return consumed is not null;
end;
$$;
revoke all on function public.consume_dunya_voice_quota(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_dunya_voice_quota(text, integer, integer) to service_role;

-- A cross-isolate lease protects the shared CPU model (even with multiple Edge workers).
create table if not exists public.dunya_voice_cpu_leases (
  owner uuid primary key,
  expires_at timestamptz not null
);
alter table public.dunya_voice_cpu_leases enable row level security;
revoke all on public.dunya_voice_cpu_leases from public, anon, authenticated;
create or replace function public.lease_dunya_voice_cpu(p_owner uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(20261015, 8090);
  delete from public.dunya_voice_cpu_leases where expires_at < clock_timestamp();
  if exists (select 1 from public.dunya_voice_cpu_leases) then return false; end if;
  insert into public.dunya_voice_cpu_leases values (p_owner, clock_timestamp() + interval '150 seconds');
  return true;
end;
$$;
create or replace function public.release_dunya_voice_cpu(p_owner uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.dunya_voice_cpu_leases where owner = p_owner;
$$;
revoke all on function public.lease_dunya_voice_cpu(uuid), public.release_dunya_voice_cpu(uuid) from public, anon, authenticated;
grant execute on function public.lease_dunya_voice_cpu(uuid), public.release_dunya_voice_cpu(uuid) to service_role;
