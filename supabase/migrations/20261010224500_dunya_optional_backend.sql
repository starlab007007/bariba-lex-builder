-- DUNYA IA — backend facultatif.
-- Le runtime local ne dépend jamais de ces objets pour répondre hors connexion.

create schema if not exists dunya;

create table if not exists dunya.pack_catalog (
  id text primary key,
  name text not null,
  version text not null,
  description text,
  manifest jsonb not null default '{}'::jsonb,
  storage_path text,
  sha256 text,
  signature text,
  min_app_version text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dunya.model_catalog (
  id text primary key,
  family text not null,
  profile text not null check (profile in ('lite','standard','pro','fallback')),
  version text not null,
  description text,
  storage_path text,
  sha256 text,
  signature text,
  size_bytes bigint,
  requirements jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dunya.user_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  backup_version integer not null default 1,
  storage_path text not null,
  content_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists dunya.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contribution_type text not null,
  language text,
  storage_path text,
  payload jsonb not null default '{}'::jsonb,
  consent_version text,
  status text not null default 'submitted'
    check (status in ('submitted','reviewing','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists dunya.sync_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  last_push_at timestamptz,
  last_pull_at timestamptz,
  last_cursor text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

alter table dunya.pack_catalog enable row level security;
alter table dunya.model_catalog enable row level security;
alter table dunya.user_backups enable row level security;
alter table dunya.contributions enable row level security;
alter table dunya.sync_state enable row level security;

drop policy if exists "dunya_pack_catalog_read" on dunya.pack_catalog;
create policy "dunya_pack_catalog_read"
  on dunya.pack_catalog for select
  to authenticated
  using (is_active = true);

drop policy if exists "dunya_model_catalog_read" on dunya.model_catalog;
create policy "dunya_model_catalog_read"
  on dunya.model_catalog for select
  to authenticated
  using (is_active = true);

drop policy if exists "dunya_user_backups_own" on dunya.user_backups;
create policy "dunya_user_backups_own"
  on dunya.user_backups for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "dunya_contributions_own" on dunya.contributions;
create policy "dunya_contributions_own"
  on dunya.contributions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "dunya_sync_state_own" on dunya.sync_state;
create policy "dunya_sync_state_own"
  on dunya.sync_state for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('dunya-models', 'dunya-models', false),
  ('dunya-knowledge', 'dunya-knowledge', false),
  ('dunya-audio', 'dunya-audio', false),
  ('dunya-contributions', 'dunya-contributions', false),
  ('dunya-backups', 'dunya-backups', false)
on conflict (id) do nothing;

drop policy if exists "dunya_models_authenticated_read" on storage.objects;
create policy "dunya_models_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'dunya-models');

drop policy if exists "dunya_knowledge_authenticated_read" on storage.objects;
create policy "dunya_knowledge_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'dunya-knowledge');

drop policy if exists "dunya_user_private_objects" on storage.objects;
create policy "dunya_user_private_objects"
  on storage.objects for all
  to authenticated
  using (
    bucket_id in ('dunya-audio','dunya-contributions','dunya-backups')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('dunya-audio','dunya-contributions','dunya-backups')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on schema dunya is 'DUNYA IA optional sync/distribution backend. Local inference remains authoritative offline.';
