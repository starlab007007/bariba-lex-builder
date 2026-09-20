alter table public.handunia_memory_paths
  add column if not exists route_places jsonb not null default '[]'::jsonb;
