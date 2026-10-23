-- Journal d'activité plateforme consultable par les administrateurs : trace
-- centralisée des actions marquantes (connexion, propositions de mots,
-- traductions, sessions vocales, erreurs) à travers tous les modules.
-- Append-only : aucune policy UPDATE/DELETE n'est créée, le journal ne peut
-- donc être ni modifié ni purgé via l'API (y compris par un admin).
create table if not exists public.platform_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor uuid null references auth.users(id) on delete set null,
  -- Capturé au moment de l'écriture (email ou nom affiché) : évite une
  -- jointure sur auth.users (non exposée via l'API) pour l'affichage admin,
  -- et reste correct même si l'identité de l'utilisateur change ensuite.
  actor_label text null,
  module text not null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'error')),
  details jsonb not null default '{}'::jsonb,
  client text null,
  app_version text null
);

comment on table public.platform_audit_log is 'Journal d''activité plateforme, lecture réservée aux admins (has_role admin). Écriture par les clients authentifiés pour leurs propres événements. Append-only.';

create index if not exists platform_audit_log_created_at_idx on public.platform_audit_log (created_at desc);
create index if not exists platform_audit_log_module_idx on public.platform_audit_log (module);
create index if not exists platform_audit_log_event_type_idx on public.platform_audit_log (event_type);
create index if not exists platform_audit_log_severity_idx on public.platform_audit_log (severity);
create index if not exists platform_audit_log_actor_idx on public.platform_audit_log (actor);

alter table public.platform_audit_log enable row level security;

-- Seuls les admins peuvent lire le journal.
create policy "platform_audit_log_select_admin"
  on public.platform_audit_log
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- Un utilisateur connecté ne peut écrire que ses propres événements.
create policy "platform_audit_log_insert_self"
  on public.platform_audit_log
  for insert
  to authenticated
  with check (actor = auth.uid());

-- Un visiteur non connecté peut journaliser un événement anonyme (actor
-- null) : utile pour l'accès visiteur déjà présent sur Classe/Apprendre.
create policy "platform_audit_log_insert_anon"
  on public.platform_audit_log
  for insert
  to anon
  with check (actor is null);
