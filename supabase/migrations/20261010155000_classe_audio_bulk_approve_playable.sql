-- Admin bulk publication for physically verified Classe audio only.
create or replace function public.classe_audio_bulk_approve_playable()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_count integer := 0;
begin
  if v_admin is null or not public.has_role(v_admin, 'admin'::public.app_role) then
    raise exception 'Admin only';
  end if;

  with candidates as (
    select id
    from public.classe_content_audios
    where status = 'submitted'
      and storage_available = true
  ),
  updated as (
    update public.classe_content_audios c
       set status = 'approved',
           admin_id = v_admin,
           admin_notes = 'Validation automatique exceptionnelle: fichier Storage physiquement vérifié.',
           reviewed_at = now(),
           updated_at = now()
     where c.id in (select id from candidates)
     returning c.id
  )
  select count(*) into v_count from updated;

  return jsonb_build_object(
    'approved', v_count,
    'skipped_unplayable', (
      select count(*)
      from public.classe_content_audios
      where status = 'submitted'
        and storage_available is not true
    )
  );
end;
$$;

revoke all on function public.classe_audio_bulk_approve_playable() from public, anon;
grant execute on function public.classe_audio_bulk_approve_playable() to authenticated;
