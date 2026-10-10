-- Make approved Classe audio readable through Storage without relying on a cross-table
-- RLS subquery evaluated in the storage request context.
create or replace function public.classe_audio_is_public(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classe_content_audios c
    where c.storage_path = p_name
      and c.status = 'approved'
      and c.is_current = true
  );
$$;

revoke all on function public.classe_audio_is_public(text) from public;
grant execute on function public.classe_audio_is_public(text) to anon, authenticated, service_role;

drop policy if exists "Public read approved classe audio" on storage.objects;
drop policy if exists "Authenticated read approved classe audio" on storage.objects;

create policy "Public read approved classe audio"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'classe-audio'
  and public.classe_audio_is_public(name)
);
