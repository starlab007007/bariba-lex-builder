-- Module « Espace » : coffre-fort numérique / GED en Bàátɔ̀nú.
-- Tables : espace_folders, espace_documents (+ metadata jsonb), espace_document_versions,
--          espace_ocr_jobs, espace_permissions. Stockage : bucket privé `espace-files`.

create extension if not exists pg_trgm with schema extensions;

-- ── Pliage typographique : Bàátɔ̀nú -> baatonu (recherche avec/sans diacritiques) ──────────
create or replace function public.espace_fold(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select translate(
           regexp_replace(normalize(lower(coalesce(t, '')), NFD), '[̀-ͯ]', '', 'g'),
           'ɛɔŋæœ', 'eonao'
         )
$$;

-- ── Dossiers ─────────────────────────────────────────────────────────────────────────────
create table public.espace_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parent_id uuid references public.espace_folders(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index espace_folders_owner_idx on public.espace_folders(owner_id, parent_id);

-- ── Documents ────────────────────────────────────────────────────────────────────────────
create table public.espace_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folder_id uuid references public.espace_folders(id) on delete set null,
  title text not null default 'Document sans titre' check (char_length(title) <= 200),
  category text not null default 'general',
  tags text[] not null default '{}',
  content_html text not null default '',
  content_text text not null default '',
  search_text text not null default '',
  source text not null default 'editor' check (source in ('editor','upload','ocr','import')),
  file_path text,                       -- fichier d'origine dans le bucket espace-files
  file_mime text,
  file_size bigint,
  metadata jsonb not null default '{}'::jsonb,  -- auteur, langue, date du manuscrit, OCR…
  version int not null default 1,
  archived boolean not null default false,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index espace_documents_owner_idx on public.espace_documents(owner_id, archived, updated_at desc);
create index espace_documents_folder_idx on public.espace_documents(folder_id);
create index espace_documents_tags_idx on public.espace_documents using gin(tags);
create index espace_documents_search_trgm on public.espace_documents using gin(search_text extensions.gin_trgm_ops);

create or replace function public.espace_documents_before()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.search_text := public.espace_fold(
    coalesce(new.title, '') || ' ' || coalesce(new.content_text, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '') || ' ' || coalesce(new.category, '')
  );
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.content_html is distinct from old.content_html then
    new.version := old.version + 1;
  end if;
  return new;
end $$;
create trigger espace_documents_before before insert or update on public.espace_documents
  for each row execute function public.espace_documents_before();

-- ── Historique de versions ───────────────────────────────────────────────────────────────
create table public.espace_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.espace_documents(id) on delete cascade,
  version int not null,
  title text not null,
  content_html text not null,
  content_text text not null,
  author_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);
create index espace_versions_doc_idx on public.espace_document_versions(document_id, version desc);

create or replace function public.espace_documents_versioning()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.espace_document_versions(document_id, version, title, content_html, content_text, author_id)
    values (new.id, new.version, new.title, new.content_html, new.content_text, auth.uid());
  elsif new.content_html is distinct from old.content_html then
    insert into public.espace_document_versions(document_id, version, title, content_html, content_text, author_id)
    values (new.id, new.version, new.title, new.content_html, new.content_text, auth.uid())
    on conflict (document_id, version) do nothing;
    -- conserve les 100 dernières révisions
    delete from public.espace_document_versions v
     where v.document_id = new.id
       and v.version <= new.version - 100;
  end if;
  return null;
end $$;
create trigger espace_documents_versioning after insert or update on public.espace_documents
  for each row execute function public.espace_documents_versioning();

-- ── Tâches OCR ───────────────────────────────────────────────────────────────────────────
create table public.espace_ocr_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_id uuid references public.espace_documents(id) on delete set null,
  file_path text,
  file_name text,
  file_mime text,
  page_count int not null default 1,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  engine text,
  confidence numeric(4,3),
  extracted_text text,
  pages jsonb not null default '[]'::jsonb,   -- [{page, text, confidence, notes[]}]
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index espace_ocr_jobs_owner_idx on public.espace_ocr_jobs(owner_id, created_at desc);

-- ── Permissions / partage ────────────────────────────────────────────────────────────────
create table public.espace_permissions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.espace_documents(id) on delete cascade,
  grantee_id uuid references auth.users(id) on delete cascade,   -- partage nominatif
  share_token text unique,                                        -- lien temporaire
  role text not null default 'viewer' check (role in ('viewer','editor')),
  expires_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (grantee_id is not null or share_token is not null)
);
create index espace_permissions_doc_idx on public.espace_permissions(document_id);
create index espace_permissions_grantee_idx on public.espace_permissions(grantee_id);

-- ── Accès ────────────────────────────────────────────────────────────────────────────────
create or replace function public.espace_can_access(_doc uuid, _need_edit boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.espace_documents d where d.id = _doc and d.owner_id = auth.uid())
      or exists (select 1 from public.espace_permissions p
                  where p.document_id = _doc and p.grantee_id = auth.uid()
                    and (p.expires_at is null or p.expires_at > now())
                    and (not _need_edit or p.role = 'editor'))
$$;

alter table public.espace_folders enable row level security;
alter table public.espace_documents enable row level security;
alter table public.espace_document_versions enable row level security;
alter table public.espace_ocr_jobs enable row level security;
alter table public.espace_permissions enable row level security;

create policy "folders_owner" on public.espace_folders for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "docs_select" on public.espace_documents for select to authenticated
  using (owner_id = auth.uid() or public.espace_can_access(id));
create policy "docs_insert" on public.espace_documents for insert to authenticated
  with check (owner_id = auth.uid());
create policy "docs_update" on public.espace_documents for update to authenticated
  using (owner_id = auth.uid() or public.espace_can_access(id, true))
  with check (owner_id = auth.uid() or public.espace_can_access(id, true));
create policy "docs_delete" on public.espace_documents for delete to authenticated
  using (owner_id = auth.uid());

create policy "versions_select" on public.espace_document_versions for select to authenticated
  using (public.espace_can_access(document_id));

create policy "ocr_owner" on public.espace_ocr_jobs for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "perm_owner_all" on public.espace_permissions for all to authenticated
  using (exists (select 1 from public.espace_documents d where d.id = document_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.espace_documents d where d.id = document_id and d.owner_id = auth.uid()));
create policy "perm_grantee_select" on public.espace_permissions for select to authenticated
  using (grantee_id = auth.uid());

-- ── RPC : partage par e-mail et par lien ─────────────────────────────────────────────────
create or replace function public.espace_share_with_email(_doc uuid, _email text, _role text default 'viewer', _expires timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid; pid uuid;
begin
  if not exists (select 1 from public.espace_documents where id = _doc and owner_id = auth.uid()) then
    raise exception 'Document introuvable' using errcode = '42501';
  end if;
  if _role not in ('viewer','editor') then raise exception 'Rôle invalide'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(_email));
  if uid is null then raise exception 'Aucun utilisateur FITILA avec cet e-mail' using errcode = 'P0002'; end if;
  if uid = auth.uid() then raise exception 'Vous êtes déjà propriétaire'; end if;
  delete from public.espace_permissions where document_id = _doc and grantee_id = uid;
  insert into public.espace_permissions(document_id, grantee_id, role, expires_at)
  values (_doc, uid, _role, _expires) returning id into pid;
  return pid;
end $$;

create or replace function public.espace_create_share_link(_doc uuid, _role text default 'viewer', _hours int default 72)
returns text language plpgsql security definer set search_path = '' as $$
declare tok text;
begin
  if not exists (select 1 from public.espace_documents where id = _doc and owner_id = auth.uid()) then
    raise exception 'Document introuvable' using errcode = '42501';
  end if;
  if _role not in ('viewer','editor') then raise exception 'Rôle invalide'; end if;
  tok := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.espace_permissions(document_id, share_token, role, expires_at)
  values (_doc, tok, _role, now() + make_interval(hours => greatest(1, least(_hours, 24*90))));
  return tok;
end $$;

create or replace function public.espace_get_shared(_token text)
returns table (id uuid, title text, content_html text, role text, expires_at timestamptz, owner_name text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, d.title, d.content_html, p.role, p.expires_at,
         coalesce(u.raw_user_meta_data->>'display_name', 'Un utilisateur FITILA'), d.updated_at
    from public.espace_permissions p
    join public.espace_documents d on d.id = p.document_id
    left join auth.users u on u.id = d.owner_id
   where p.share_token = _token and (p.expires_at is null or p.expires_at > now())
$$;

create or replace function public.espace_save_shared(_token text, _html text, _text text)
returns int language plpgsql security definer set search_path = '' as $$
declare did uuid; v int;
begin
  select p.document_id into did from public.espace_permissions p
   where p.share_token = _token and p.role = 'editor' and (p.expires_at is null or p.expires_at > now());
  if did is null then raise exception 'Lien invalide, expiré ou en lecture seule' using errcode = '42501'; end if;
  update public.espace_documents set content_html = _html, content_text = _text where id = did
  returning version into v;
  return v;
end $$;

revoke all on function public.espace_get_shared(text) from public;
grant execute on function public.espace_get_shared(text) to anon, authenticated;
revoke all on function public.espace_save_shared(text, text, text) from public;
grant execute on function public.espace_save_shared(text, text, text) to anon, authenticated;
revoke all on function public.espace_share_with_email(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.espace_share_with_email(uuid, text, text, timestamptz) to authenticated;
revoke all on function public.espace_create_share_link(uuid, text, int) from public, anon;
grant execute on function public.espace_create_share_link(uuid, text, int) to authenticated;
revoke all on function public.espace_can_access(uuid, boolean) from public, anon;
grant execute on function public.espace_can_access(uuid, boolean) to authenticated;

-- ── Stockage privé ───────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('espace-files', 'espace-files', false, 26214400)
on conflict (id) do nothing;

create policy "espace_files_owner" on storage.objects for all to authenticated
  using (bucket_id = 'espace-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'espace-files' and (storage.foldername(name))[1] = auth.uid()::text);
