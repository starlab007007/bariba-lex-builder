create table if not exists public.handunia_lineage_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  lineage_key text not null,
  active boolean not null default true,
  source text not null default 'community',
  designated_at timestamptz not null default now(),
  primary key (user_id, lineage_key)
);

alter table public.handunia_lineage_memberships enable row level security;

drop policy if exists "Handunia lineage own membership readable"
  on public.handunia_lineage_memberships;
create policy "Handunia lineage own membership readable"
on public.handunia_lineage_memberships
for select
to authenticated
using (auth.uid() = user_id);

insert into public.handunia_lineage_memberships (
  user_id, lineage_key, active, source
)
select
  id,
  trim(raw_user_meta_data ->> 'lineage_key'),
  true,
  'migration_snapshot'
from auth.users
where coalesce(trim(raw_user_meta_data ->> 'lineage_key'), '') <> ''
on conflict (user_id, lineage_key) do nothing;

drop policy if exists "Handunia fragments visible by scope"
  on public.handunia_fragments;

create policy "Handunia fragments visible by scope"
on public.handunia_fragments
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    withdrawn_at is null
    and (
      scope_level in ('community', 'all')
      or (
        scope_level = 'lineage'
        and lineage_key is not null
        and exists (
          select 1
          from public.handunia_lineage_memberships membership
          where membership.user_id = auth.uid()
            and membership.lineage_key = handunia_fragments.lineage_key
            and membership.active = true
        )
      )
      or (
        scope_level = 'elders'
        and exists (
          select 1
          from public.handunia_guardians guardian
          where guardian.user_id = auth.uid()
            and guardian.active = true
        )
      )
    )
  )
);
