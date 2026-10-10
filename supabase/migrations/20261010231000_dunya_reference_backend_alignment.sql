-- DUNYA IA — alignement de la fondation Supabase sur la spécification V1.0.
-- Les anciennes tables de compatibilité restent en place pour ne rien casser.

create schema if not exists dunya;

create table if not exists dunya.devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  device_label text,
  platform text not null,
  app_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique(id,user_id)
);

create table if not exists dunya.conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  title text,
  language text not null default 'fr',
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_dunya_conversations_owner
on dunya.conversations(user_id,updated_at desc);

create table if not exists dunya.messages (
  id uuid primary key,
  conversation_id uuid not null references dunya.conversations(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('user','assistant','tool')),
  content text not null,
  client_created_at timestamptz,
  received_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_dunya_messages_thread
on dunya.messages(conversation_id,received_at);

create table if not exists dunya.memory_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  memory_type text not null,
  content_ciphertext text not null,
  key_version integer not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists dunya.knowledge_packs (
  id uuid primary key,
  code text not null unique,
  title text not null,
  language text,
  publisher text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists dunya.pack_releases (
  id uuid primary key,
  pack_id uuid not null references dunya.knowledge_packs(id),
  version text not null,
  manifest_path text not null,
  sha256 text not null,
  signature text not null,
  min_app_version text,
  published_at timestamptz,
  unique(pack_id,version)
);

create table if not exists dunya.model_registry (
  id uuid primary key,
  model_code text not null,
  version text not null,
  runtime text not null,
  artifact_path text not null,
  artifact_sha256 text not null,
  license_id text,
  min_ram_mb integer,
  status text not null default 'testing',
  unique(model_code,version)
);

-- La table contributions existait déjà dans le premier socle.
-- On ajoute les colonnes canoniques sans supprimer les colonnes de compatibilité.
alter table dunya.contributions
  add column if not exists source_device_id uuid,
  add column if not exists review_status text not null default 'pending';

alter table dunya.devices enable row level security;
alter table dunya.conversations enable row level security;
alter table dunya.messages enable row level security;
alter table dunya.memory_records enable row level security;
alter table dunya.knowledge_packs enable row level security;
alter table dunya.pack_releases enable row level security;
alter table dunya.model_registry enable row level security;
alter table dunya.contributions enable row level security;

drop policy if exists dunya_own_devices on dunya.devices;
create policy dunya_own_devices
on dunya.devices
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists dunya_own_conversations on dunya.conversations;
create policy dunya_own_conversations
on dunya.conversations
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists dunya_own_messages on dunya.messages;
create policy dunya_own_messages
on dunya.messages
for all to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from dunya.conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from dunya.conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists dunya_own_memory on dunya.memory_records;
create policy dunya_own_memory
on dunya.memory_records
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists dunya_own_contributions on dunya.contributions;
create policy dunya_own_contributions
on dunya.contributions
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists dunya_create_contributions on dunya.contributions;
create policy dunya_create_contributions
on dunya.contributions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and review_status = 'pending'
);

grant usage on schema dunya to authenticated;
grant select, insert, update, delete on dunya.devices to authenticated;
grant select, insert, update, delete on dunya.conversations to authenticated;
grant select, insert, update, delete on dunya.messages to authenticated;
grant select, insert, update, delete on dunya.memory_records to authenticated;
grant select, insert on dunya.contributions to authenticated;

comment on table dunya.memory_records is
  'DUNYA memory synced only by explicit consent; content_ciphertext must already be encrypted client-side.';
