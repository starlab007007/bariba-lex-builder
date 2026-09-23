-- Handunia Wasa — moteur patrimonial et provenance.
-- Le feed reste une interface de découverte : les likes/partages ne
-- participent à aucune fonction de classement ou statistique patrimoniale.

create table if not exists public.handunia_memory_events (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null,
  fragment_id uuid references public.handunia_fragments(id) on delete set null,
  actor_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_handunia_memory_events_memory
  on public.handunia_memory_events (memory_id, created_at desc);
create index if not exists idx_handunia_memory_events_actor
  on public.handunia_memory_events (actor_id, created_at desc);

alter table public.handunia_memory_events enable row level security;

drop policy if exists "Handunia memory events readable by owners and guardians"
  on public.handunia_memory_events;
create policy "Handunia memory events readable by owners and guardians"
  on public.handunia_memory_events
  for select
  to authenticated
  using (
    actor_id = auth.uid()
    or exists (
      select 1
      from public.handunia_fragments f
      where f.id = fragment_id
        and f.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.handunia_guardians g
      where g.user_id = auth.uid()
        and g.active = true
    )
  );

grant select on public.handunia_memory_events to authenticated;
revoke insert, update, delete on public.handunia_memory_events
  from anon, authenticated;

create or replace function public.handunia_log_memory_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.handunia_memory_events(
      memory_id, fragment_id, actor_id, event_type, payload
    ) values (
      new.id,
      new.id,
      coalesce(v_actor, new.user_id),
      'memory_created',
      jsonb_build_object(
        'lieu_id', new.lieu_id,
        'scope_level', new.scope_level,
        'theme_key', new.theme_key,
        'period_label', new.period_label
      )
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.handunia_memory_events(
      memory_id, fragment_id, actor_id, event_type, payload
    ) values (
      old.id,
      null,
      coalesce(v_actor, old.user_id),
      'memory_deleted',
      jsonb_build_object(
        'lieu_id', old.lieu_id,
        'scope_level', old.scope_level,
        'theme_key', old.theme_key,
        'period_label', old.period_label
      )
    );
    return old;
  end if;

  if old.scope_level is distinct from new.scope_level then
    insert into public.handunia_memory_events(
      memory_id, fragment_id, actor_id, event_type, payload
    ) values (
      new.id,
      new.id,
      coalesce(v_actor, new.user_id),
      'scope_changed',
      jsonb_build_object('from', old.scope_level, 'to', new.scope_level)
    );
  end if;

  if old.withdrawn_at is null and new.withdrawn_at is not null then
    insert into public.handunia_memory_events(
      memory_id, fragment_id, actor_id, event_type, payload
    ) values (
      new.id, new.id, coalesce(v_actor, new.user_id), 'withdrawn', '{}'::jsonb
    );
  elsif old.withdrawn_at is not null and new.withdrawn_at is null then
    insert into public.handunia_memory_events(
      memory_id, fragment_id, actor_id, event_type, payload
    ) values (
      new.id, new.id, coalesce(v_actor, new.user_id), 'restored', '{}'::jsonb
    );
  end if;

  if old.transcript_reviewed_by_guardian is distinct from
      new.transcript_reviewed_by_guardian
     and new.transcript_reviewed_by_guardian = true then
    insert into public.handunia_memory_events(
      memory_id, fragment_id, actor_id, event_type, payload
    ) values (
      new.id,
      new.id,
      coalesce(v_actor, new.user_id),
      'guardian_reviewed',
      '{}'::jsonb
    );
  end if;

  if old.text is distinct from new.text
     or old.transcript_text is distinct from new.transcript_text then
    insert into public.handunia_memory_events(
      memory_id, fragment_id, actor_id, event_type, payload
    ) values (
      new.id,
      new.id,
      coalesce(v_actor, new.user_id),
      'memory_updated',
      jsonb_build_object(
        'text_changed', old.text is distinct from new.text,
        'transcript_changed',
          old.transcript_text is distinct from new.transcript_text
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handunia_memory_events
  on public.handunia_fragments;
create trigger trg_handunia_memory_events
after insert or update or delete
on public.handunia_fragments
for each row execute function public.handunia_log_memory_event();

create or replace view public.handunia_place_memory_stats
with (security_invoker = true)
as
with visible_fragments as (
  select f.*
  from public.handunia_fragments f
  where f.withdrawn_at is null
),
voices as (
  select f.lieu_id, f.user_id
  from visible_fragments f
  where f.user_id is not null
  union
  select f.lieu_id, c.user_id
  from visible_fragments f
  join public.handunia_corroborations c on c.fragment_id = f.id
  where c.user_id is not null
),
fragment_stats as (
  select
    f.lieu_id,
    count(*)::int as memory_count,
    count(distinct f.user_id)::int as author_count,
    min(f.period_year) as oldest_memory_year,
    max(f.period_year) as latest_memory_year,
    count(distinct coalesce(
      f.period_year::text,
      nullif(trim(f.period_label), '')
    ))::int as period_count,
    count(distinct nullif(trim(f.theme_key), ''))::int as topic_count,
    count(distinct nullif(trim(f.lineage_key), ''))::int as lineage_count,
    count(*) filter (
      where exists (
        select 1
        from public.handunia_corroborations c
        where c.fragment_id = f.id
      )
    )::int as corroborated_count
  from visible_fragments f
  group by f.lieu_id
),
voice_stats as (
  select lieu_id, count(distinct user_id)::int as distinct_voice_count
  from voices
  group by lieu_id
),
divergence_stats as (
  select lieu_id, count(*)::int as divergence_count
  from public.handunia_divergences
  where status = 'open'
  group by lieu_id
),
gap_stats as (
  select lieu_id, count(*)::int as gap_count
  from public.handunia_memory_gaps
  where resolved_at is null
  group by lieu_id
)
select
  l.id as lieu_id,
  coalesce(fs.memory_count, 0)::int as memory_count,
  coalesce(vs.distinct_voice_count, 0)::int as distinct_voice_count,
  fs.oldest_memory_year,
  fs.latest_memory_year,
  coalesce(fs.corroborated_count, 0)::int as corroborated_count,
  coalesce(ds.divergence_count, 0)::int as divergence_count,
  coalesce(gs.gap_count, 0)::int as gap_count,
  coalesce(fs.lineage_count, 0)::int as lineage_count,
  coalesce(fs.period_count, 0)::int as generation_count,
  coalesce(fs.period_count, 0)::int as period_count,
  coalesce(fs.topic_count, 0)::int as topic_count,
  least(
    1.0,
    0.30 * least(coalesce(vs.distinct_voice_count, 0)::numeric / 12.0, 1.0)
    + 0.25 * least(coalesce(fs.period_count, 0)::numeric / 5.0, 1.0)
    + 0.20 * least(coalesce(fs.topic_count, 0)::numeric / 6.0, 1.0)
    + 0.15 * case
        when coalesce(fs.memory_count, 0) = 0 then 0
        else coalesce(fs.corroborated_count, 0)::numeric
             / fs.memory_count::numeric
      end
    + 0.10 * case
        when fs.oldest_memory_year is null or fs.latest_memory_year is null
          then 0
        else least(
          abs(fs.latest_memory_year - fs.oldest_memory_year)::numeric / 60.0,
          1.0
        )
      end
  )::double precision as density_score
from public.handunia_lieux l
left join fragment_stats fs on fs.lieu_id = l.id
left join voice_stats vs on vs.lieu_id = l.id
left join divergence_stats ds on ds.lieu_id = l.id
left join gap_stats gs on gs.lieu_id = l.id;

grant select on public.handunia_place_memory_stats to anon, authenticated;

create or replace function public.handunia_place_memory_summary(p_lieu_id text)
returns setof public.handunia_place_memory_stats
language sql
stable
security invoker
as $$
  select *
  from public.handunia_place_memory_stats
  where lieu_id = p_lieu_id;
$$;

grant execute on function public.handunia_place_memory_summary(text)
  to anon, authenticated;

create or replace function public.handunia_memory_neighborhood(
  p_fragment_id uuid,
  p_depth integer default 1
)
returns table (
  fragment_id uuid,
  depth integer,
  relation_type text,
  memory_text text,
  lieu_id text,
  period_label text,
  theme_key text,
  created_at timestamptz
)
language sql
stable
security invoker
as $$
  with recursive graph(fragment_id, depth, relation_type) as (
    select p_fragment_id, 0, 'self'::text
    union
    select
      case
        when links.source_fragment_id = graph.fragment_id
          then links.target_fragment_id
        else links.source_fragment_id
      end,
      graph.depth + 1,
      links.link_type
    from graph
    join public.handunia_memory_links links
      on links.source_fragment_id = graph.fragment_id
      or links.target_fragment_id = graph.fragment_id
    where graph.depth < least(greatest(p_depth, 1), 3)
      and case
        when links.source_fragment_id = graph.fragment_id
          then links.target_fragment_id
        else links.source_fragment_id
      end is not null
  )
  select distinct on (g.fragment_id)
    f.id,
    g.depth,
    g.relation_type,
    f.text,
    f.lieu_id,
    f.period_label,
    f.theme_key,
    f.created_at
  from graph g
  join public.handunia_fragments f on f.id = g.fragment_id
  where f.withdrawn_at is null
  order by g.fragment_id, g.depth;
$$;

grant execute on function public.handunia_memory_neighborhood(uuid, integer)
  to anon, authenticated;

create or replace function public.handunia_next_memory(
  p_fragment_id uuid,
  p_limit integer default 8
)
returns table (
  fragment_id uuid,
  transition_reason text,
  heritage_hint numeric
)
language sql
stable
security invoker
as $$
  with current_memory as (
    select *
    from public.handunia_fragments
    where id = p_fragment_id
      and withdrawn_at is null
    limit 1
  ),
  candidates as (
    select
      f.id,
      case
        when f.lieu_id = c.lieu_id
          and coalesce(f.period_label, '') <> coalesce(c.period_label, '')
          then 'same_place_other_period'
        when exists (
          select 1
          from public.handunia_memory_links l
          where (
            l.source_fragment_id = c.id and l.target_fragment_id = f.id
          ) or (
            l.target_fragment_id = c.id and l.source_fragment_id = f.id
          )
        ) then 'linked_memory'
        when f.theme_key is not null and f.theme_key = c.theme_key
          then 'same_theme'
        when f.lineage_key is not null and f.lineage_key = c.lineage_key
          then 'same_lineage'
        when f.period_label is not null and f.period_label = c.period_label
          then 'same_period'
        else 'other_memory'
      end as reason,
      (
        case when f.lieu_id = c.lieu_id then 25 else 0 end
        + case when f.lacuna_filled then 20 else 0 end
        + case when f.theme_key is not null and f.theme_key = c.theme_key
            then 12 else 0 end
        + case when f.lineage_key is not null and f.lineage_key = c.lineage_key
            then 10 else 0 end
        + case when f.period_label is not null and f.period_label = c.period_label
            then 8 else 0 end
        + least(
            (
              select count(*)::numeric
              from public.handunia_corroborations cr
              where cr.fragment_id = f.id
            ) * 3,
            15
          )
      )::numeric as heritage_hint
    from public.handunia_fragments f
    cross join current_memory c
    where f.id <> c.id
      and f.withdrawn_at is null
  )
  select id, reason, heritage_hint
  from candidates
  order by heritage_hint desc, id
  limit least(greatest(p_limit, 1), 24);
$$;

grant execute on function public.handunia_next_memory(uuid, integer)
  to anon, authenticated;

create or replace function public.handunia_memory_gap_priorities(
  p_limit integer default 8
)
returns setof public.handunia_memory_gaps
language sql
stable
security invoker
as $$
  select *
  from public.handunia_memory_gaps
  where resolved_at is null
  order by severity desc, detected_at asc
  limit least(greatest(p_limit, 1), 24);
$$;

grant execute on function public.handunia_memory_gap_priorities(integer)
  to authenticated;
