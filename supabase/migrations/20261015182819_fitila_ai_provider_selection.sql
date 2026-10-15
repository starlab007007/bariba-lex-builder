-- Global AI choice. Only the server can write after checking provider readiness.
create table public.fitila_ai_settings (
  id integer primary key default 1 check (id = 1),
  active_provider text not null default 'mistral' check (active_provider in ('mistral', 'gemini')),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.fitila_ai_settings enable row level security;
revoke all on public.fitila_ai_settings from public, anon, authenticated;
grant select on public.fitila_ai_settings to authenticated;
grant select, insert, update on public.fitila_ai_settings to service_role;
create policy "Administrators read AI configuration"
  on public.fitila_ai_settings for select to authenticated
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));
insert into public.fitila_ai_settings (id, active_provider) values (1, 'mistral');
comment on table public.fitila_ai_settings is 'Server-controlled AI provider; contains no credentials. Changes are tested and authorised through ai-provider-settings.';
