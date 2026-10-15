-- Live linguistic references only: no recordings, user transcripts or unreviewed feedback.
-- Similarity retrieval is not a certificate of grammatical correctness.
create or replace function public.fitila_asr_search_key(p_text text)
returns text language sql immutable strict parallel safe set search_path = '' as $$
  select btrim(regexp_replace(
    replace(replace(replace(replace(replace(
      normalize(translate(normalize(lower(p_text), NFD), U&'\0300\0301\0302\0304\030C', ''), NFC),
      'ɔ','o'),'ɛ','e'),'ʋ','u'),'ŋ','ng'),'ɲ','ny'),
    '[^[:alnum:]''̃]+', ' ', 'g'));
$$;
revoke all on function public.fitila_asr_search_key(text) from public;
grant execute on function public.fitila_asr_search_key(text) to authenticated, service_role;

create index if not exists fitila_asr_corpus_ba_trgm on public.bariba_corpus_phrases
  using gin (public.fitila_asr_search_key(text_bariba) extensions.gin_trgm_ops) where is_active is true;
create index if not exists fitila_asr_corpus_fr_trgm on public.bariba_corpus_phrases
  using gin (public.fitila_asr_search_key(text_french) extensions.gin_trgm_ops) where is_active is true;
create index if not exists fitila_asr_apprendre_ba_trgm on public.apprendre_audio_items
  using gin (public.fitila_asr_search_key(text_ba) extensions.gin_trgm_ops) where in_content is true;
create index if not exists fitila_asr_apprendre_fr_trgm on public.apprendre_audio_items
  using gin (public.fitila_asr_search_key(text_fr) extensions.gin_trgm_ops) where in_content is true;
create index if not exists fitila_asr_dictionary_trgm on public.dictionary_entries
  using gin (public.fitila_asr_search_key(word) extensions.gin_trgm_ops);

create or replace view public.fitila_asr_references with (security_invoker = true) as
select 'bba'::text as language, word as text, 'dictionary'::text as source, id::text as source_id,
  case when is_verified is true then 'verified' else 'catalogue' end::text as validation, 'word'::text as kind
from public.dictionary_entries where nullif(btrim(word),'') is not null
union all
select 'bba', v.text, 'dictionary', d.id::text,
  case when d.is_verified is true then 'verified' else 'catalogue' end, 'form'
from public.dictionary_entries d cross join lateral unnest(array[d.plural_form,d.verb_root,d.verb_radical,d.accomplished_form,d.negative_form,d.benefactive_form] || coalesce(d.variants,array[]::text[])) as v(text)
where nullif(btrim(v.text),'') is not null
union all
select 'bba', v.text, 'dictionary', d.id::text,
  case when d.is_verified is true then 'verified' else 'catalogue' end, 'example'
from public.dictionary_entries d cross join lateral unnest(d.example_bariba) as v(text) where nullif(btrim(v.text),'') is not null
union all
select 'fr', v.text, 'dictionary', d.id::text,
  case when d.is_verified is true then 'verified' else 'catalogue' end, 'example'
from public.dictionary_entries d cross join lateral unnest(d.example_francais) as v(text) where nullif(btrim(v.text),'') is not null
union all
select 'bba', text_bariba, 'corpus', id::text, 'active', 'phrase'
from public.bariba_corpus_phrases where is_active is true and nullif(btrim(text_bariba),'') is not null
union all
select 'fr', text_french, 'corpus', id::text, 'active', 'phrase'
from public.bariba_corpus_phrases where is_active is true and nullif(btrim(text_french),'') is not null
union all
select v.lang, v.text, 'apprendre', i.audio_key, 'catalogue', i.kind
from public.apprendre_audio_items i
cross join lateral (values('bba',i.text_ba),('fr',i.text_fr)) as v(lang,text)
where i.in_content is true and nullif(btrim(v.text),'') is not null
  and not exists(select 1 from public.apprendre_text_issues issues where issues.audio_key=i.audio_key and issues.status not in ('resolved','dismissed','fixed'))
union all
select v.lang, v.text, 'apprendre-content', m.id || ':' || coalesce(j.item->>'id',j.item->>'ref',md5(j.item::text)), 'catalogue', v.kind
from public.apprendre_module_content m
cross join lateral jsonb_path_query(m.content,'strict $.** ? (@.type() == "object")') as j(item)
cross join lateral (values
 ('bba',j.item->>'ba','content'),('fr',j.item->>'fr','content'),
 ('bba',j.item->>'text_ba','content'),('fr',j.item->>'text_fr','content'),
 ('bba',j.item->>'ex_ba','example'),('fr',j.item->>'ex_fr','example'),
 ('bba',j.item->>'pl','form')) as v(lang,text,kind)
where nullif(btrim(v.text),'') is not null
  and coalesce(j.item->>'status',j.item->>'st','') not in ('a_valider','pending','rejected','reject','draft');
revoke all on public.fitila_asr_references from public, anon, authenticated;
grant select on public.fitila_asr_references to service_role;

create or replace function public.fitila_asr_reference_candidates(p_queries text[], p_language text)
returns table(query_index integer, text text, source text, source_id text, validation text, kind text, rank real)
language plpgsql stable security invoker set search_path = '' set statement_timeout = '3000ms' as $$
begin
  if p_language not in ('bba','fr') or coalesce(cardinality(p_queries),0) not between 1 and 24
    or exists(select 1 from unnest(p_queries) q where q is null or length(q) not between 1 and 220) then
    raise exception 'Invalid transcription search';
  end if;
  return query
  select (q.n-1)::integer, c.text, c.source, c.source_id, c.validation, c.kind, c.rank
  from unnest(p_queries) with ordinality q(value,n)
  cross join lateral (
    select r.text, r.source, r.source_id, r.validation, r.kind,
      extensions.similarity(public.fitila_asr_search_key(r.text),public.fitila_asr_search_key(q.value)) as rank
    from public.fitila_asr_references r
    where r.language = p_language and length(r.text) between 1 and 320
      and public.fitila_asr_search_key(r.text) operator(extensions.%) public.fitila_asr_search_key(q.value)
    order by 6 desc, (r.validation='verified') desc, r.source, r.source_id
    limit 24
  ) c;
end;
$$;
revoke all on function public.fitila_asr_reference_candidates(text[],text) from public, anon, authenticated;
grant execute on function public.fitila_asr_reference_candidates(text[],text) to service_role;
