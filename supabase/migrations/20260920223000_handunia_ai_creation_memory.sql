alter table public.handunia_fragments
  add column if not exists language_code text,
  add column if not exists ai_assisted boolean not null default false,
  add column if not exists ai_summary text,
  add column if not exists ai_confidence numeric,
  add column if not exists review_status text not null default 'unreviewed',
  add column if not exists sensitivity_level text,
  add column if not exists suggested_scope text,
  add column if not exists memory_state text not null default 'sealed',
  add column if not exists transcript_segments jsonb not null default '[]'::jsonb;

create table if not exists public.handunia_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lieu_id text not null references public.handunia_lieux(id) on delete cascade,
  language_code text not null default 'ba',
  initial_question text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.handunia_fragment_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fragment_id uuid not null references public.handunia_fragments(id) on delete cascade,
  entity_type text not null,
  entity_value text not null,
  confidence numeric,
  evidence_text text,
  start_ms integer,
  end_ms integer,
  validated boolean not null default false,
  corrected_value text,
  created_at timestamptz not null default now()
);

create table if not exists public.handunia_fragment_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fragment_id uuid not null references public.handunia_fragments(id) on delete cascade,
  claim_text text not null,
  confidence numeric,
  evidence_text text,
  start_ms integer,
  end_ms integer,
  validated boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.handunia_memory_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_fragment_id uuid not null references public.handunia_fragments(id) on delete cascade,
  target_fragment_id uuid references public.handunia_fragments(id) on delete cascade,
  link_type text not null check (link_type in ('corroborates','nuances','diverges','mentions_place','mentions_person','same_path','same_period','same_theme')),
  confidence numeric,
  rationale text,
  created_at timestamptz not null default now()
);

create table if not exists public.handunia_memory_gaps (
  id uuid primary key default gen_random_uuid(),
  lieu_id text not null references public.handunia_lieux(id) on delete cascade,
  gap_type text not null,
  gap_value text not null,
  severity numeric not null default 0.5,
  source_count integer not null default 0,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.handunia_ai_scope_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fragment_id uuid not null references public.handunia_fragments(id) on delete cascade,
  suggested_scope text not null,
  reason text,
  confidence numeric,
  accepted boolean,
  created_at timestamptz not null default now()
);

create index if not exists handunia_ai_sessions_user_idx on public.handunia_ai_sessions(user_id, created_at desc);
create index if not exists handunia_ai_sessions_lieu_idx on public.handunia_ai_sessions(lieu_id, created_at desc);
create index if not exists handunia_fragment_entities_fragment_idx on public.handunia_fragment_entities(fragment_id);
create index if not exists handunia_fragment_claims_fragment_idx on public.handunia_fragment_claims(fragment_id);
create index if not exists handunia_memory_links_source_idx on public.handunia_memory_links(source_fragment_id);
create index if not exists handunia_memory_links_target_idx on public.handunia_memory_links(target_fragment_id);
create index if not exists handunia_memory_gaps_lieu_idx on public.handunia_memory_gaps(lieu_id, resolved_at);
create index if not exists handunia_scope_suggestions_fragment_idx on public.handunia_ai_scope_suggestions(fragment_id);

alter table public.handunia_ai_sessions enable row level security;
alter table public.handunia_fragment_entities enable row level security;
alter table public.handunia_fragment_claims enable row level security;
alter table public.handunia_memory_links enable row level security;
alter table public.handunia_memory_gaps enable row level security;
alter table public.handunia_ai_scope_suggestions enable row level security;

drop policy if exists "Handunia AI sessions own rows" on public.handunia_ai_sessions;
create policy "Handunia AI sessions own rows"
on public.handunia_ai_sessions for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Handunia entities own rows" on public.handunia_fragment_entities;
create policy "Handunia entities own rows"
on public.handunia_fragment_entities for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Handunia claims own rows" on public.handunia_fragment_claims;
create policy "Handunia claims own rows"
on public.handunia_fragment_claims for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Handunia links own rows" on public.handunia_memory_links;
create policy "Handunia links own rows"
on public.handunia_memory_links for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Handunia gaps readable" on public.handunia_memory_gaps;
create policy "Handunia gaps readable"
on public.handunia_memory_gaps for select
to authenticated
using (true);

drop policy if exists "Handunia scope suggestions own rows" on public.handunia_ai_scope_suggestions;
create policy "Handunia scope suggestions own rows"
on public.handunia_ai_scope_suggestions for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
