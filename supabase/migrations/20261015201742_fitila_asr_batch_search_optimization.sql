-- Normalize live references once per batch, including recursive Apprendre content.
-- Avoid repeating that extraction for every recognized clause.
create or replace function public.fitila_asr_reference_candidates(p_queries text[], p_language text)
returns table(query_index integer, text text, source text, source_id text, validation text, kind text, rank real)
language plpgsql stable security invoker set search_path = '' set statement_timeout = '3000ms' as $$
begin
  if p_language not in ('bba','fr') or coalesce(cardinality(p_queries),0) not between 1 and 24
    or exists(select 1 from unnest(p_queries) as input(value) where input.value is null or length(input.value) not between 1 and 220) then
    raise exception 'Invalid transcription search';
  end if;
  return query
  with queries as materialized (
    select (q.n-1)::integer as query_index, public.fitila_asr_search_key(q.value) as key
    from unnest(p_queries) with ordinality q(value,n)
  ), refs as materialized (
    select r.text, r.source, r.source_id, r.validation, r.kind, public.fitila_asr_search_key(r.text) as key
    from public.fitila_asr_references r
    where r.language=p_language and length(r.text) between 1 and 320
  )
  select q.query_index, c.text, c.source, c.source_id, c.validation, c.kind, c.rank
  from queries q
  cross join lateral (
    select r.text, r.source, r.source_id, r.validation, r.kind, extensions.similarity(r.key,q.key) as rank
    from refs r where r.key operator(extensions.%) q.key
    order by 6 desc, (r.validation='verified') desc, r.source, r.source_id
    limit 24
  ) c;
end;
$$;
revoke all on function public.fitila_asr_reference_candidates(text[],text) from public, anon, authenticated;
grant execute on function public.fitila_asr_reference_candidates(text[],text) to service_role;
