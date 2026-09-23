-- Handunia Wasa — durcissement sécurité du moteur patrimonial.

revoke all on function public.handunia_log_memory_event()
  from public, anon, authenticated;

alter function public.handunia_place_memory_summary(text)
  set search_path = public;
alter function public.handunia_memory_neighborhood(uuid, integer)
  set search_path = public;
alter function public.handunia_next_memory(uuid, integer)
  set search_path = public;
alter function public.handunia_memory_gap_priorities(integer)
  set search_path = public;

-- Les RPC de lecture restent invoker et ne contournent pas les RLS.
grant execute on function public.handunia_place_memory_summary(text)
  to anon, authenticated;
grant execute on function public.handunia_memory_neighborhood(uuid, integer)
  to anon, authenticated;
grant execute on function public.handunia_next_memory(uuid, integer)
  to anon, authenticated;
grant execute on function public.handunia_memory_gap_priorities(integer)
  to authenticated;
