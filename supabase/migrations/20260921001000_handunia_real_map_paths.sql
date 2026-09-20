alter table public.handunia_memory_paths
  add column if not exists route_mode text not null default 'legacy'
    check (route_mode in ('road','historical','legacy')),
  add column if not exists start_name text,
  add column if not exists end_name text,
  add column if not exists distance_m double precision,
  add column if not exists duration_s double precision,
  add column if not exists provider text,
  add column if not exists road_matched boolean not null default false,
  add column if not exists geometry_type text not null default 'normalized';

create index if not exists idx_handunia_memory_paths_fragment_captured
  on public.handunia_memory_paths(fragment_id, captured_at desc);
