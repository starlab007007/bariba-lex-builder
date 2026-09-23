-- Sagesse Battle communautaire : défis utilisateurs, notation et métriques de qualité.
create table if not exists public.battle_user_challenges (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  challenge_type text not null default 'complete_proverb'
    check (challenge_type in ('complete_proverb','interpretation')),
  prompt_bariba text not null check (char_length(prompt_bariba) between 3 and 800),
  prompt_francais text not null default '' check (char_length(prompt_francais) <= 800),
  answer_key text,
  accepted_answers text[] not null default '{}'::text[],
  context_text text not null default '' check (char_length(context_text) <= 1200),
  theme text not null default 'sagesse' check (char_length(theme) between 2 and 80),
  response_mode text not null default 'text'
    check (response_mode in ('text','voice','both')),
  duration_hours integer not null default 24
    check (duration_hours in (24,48,168)),
  visibility text not null default 'public'
    check (visibility in ('public','private')),
  status text not null default 'published'
    check (status in ('draft','published','closed','hidden')),
  moderation_status text not null default 'approved'
    check (moderation_status in ('approved','pending','flagged','rejected')),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists battle_user_challenges_feed_idx
  on public.battle_user_challenges(status, visibility, published_at desc);
create index if not exists battle_user_challenges_creator_idx
  on public.battle_user_challenges(created_by, created_at desc);

create table if not exists public.battle_challenge_ratings (
  challenge_id uuid not null references public.battle_user_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create index if not exists battle_challenge_ratings_challenge_idx
  on public.battle_challenge_ratings(challenge_id);

create unique index if not exists battle_responses_challenge_user_uidx
  on public.battle_responses(challenge_id, user_id);

alter table public.battle_user_challenges enable row level security;
alter table public.battle_challenge_ratings enable row level security;

drop policy if exists battle_user_challenges_read on public.battle_user_challenges;
create policy battle_user_challenges_read
on public.battle_user_challenges for select
using (
  (visibility = 'public' and status = 'published' and moderation_status = 'approved')
  or auth.uid() = created_by
);

drop policy if exists battle_user_challenges_insert_own on public.battle_user_challenges;
create policy battle_user_challenges_insert_own
on public.battle_user_challenges for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists battle_user_challenges_update_own on public.battle_user_challenges;
create policy battle_user_challenges_update_own
on public.battle_user_challenges for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists battle_user_challenges_delete_own on public.battle_user_challenges;
create policy battle_user_challenges_delete_own
on public.battle_user_challenges for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists battle_challenge_ratings_read on public.battle_challenge_ratings;
create policy battle_challenge_ratings_read
on public.battle_challenge_ratings for select
using (true);

drop policy if exists battle_challenge_ratings_insert_own on public.battle_challenge_ratings;
create policy battle_challenge_ratings_insert_own
on public.battle_challenge_ratings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists battle_challenge_ratings_update_own on public.battle_challenge_ratings;
create policy battle_challenge_ratings_update_own
on public.battle_challenge_ratings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists battle_challenge_ratings_delete_own on public.battle_challenge_ratings;
create policy battle_challenge_ratings_delete_own
on public.battle_challenge_ratings for delete
to authenticated
using (auth.uid() = user_id);

grant select on public.battle_user_challenges to anon, authenticated;
grant insert, update, delete on public.battle_user_challenges to authenticated;
grant select on public.battle_challenge_ratings to anon, authenticated;
grant insert, update, delete on public.battle_challenge_ratings to authenticated;

create or replace function public.battle_set_user_challenge_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'published' and new.expires_at is null then
    new.expires_at := coalesce(new.published_at, now()) + make_interval(hours => new.duration_hours);
  end if;
  return new;
end;
$$;

drop trigger if exists battle_user_challenges_set_timestamps on public.battle_user_challenges;
create trigger battle_user_challenges_set_timestamps
before insert or update on public.battle_user_challenges
for each row execute function public.battle_set_user_challenge_timestamps();

create or replace function public.battle_guard_challenge_rating()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
declare owner_id uuid;
begin
  select created_by into owner_id
  from public.battle_user_challenges
  where id=new.challenge_id;
  if owner_id is null then
    raise exception 'Défi introuvable';
  end if;
  if owner_id = new.user_id then
    raise exception 'Le créateur ne peut pas noter son propre défi';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists battle_challenge_ratings_guard on public.battle_challenge_ratings;
create trigger battle_challenge_ratings_guard
before insert or update on public.battle_challenge_ratings
for each row execute function public.battle_guard_challenge_rating();

create or replace function public.battle_user_challenge_metrics(p_challenge_id uuid)
returns table(
  response_count bigint,
  avg_response_score numeric,
  rating_average numeric,
  rating_count bigint,
  quality_score numeric
)
language sql
security invoker
set search_path = public
as $$
  with responses as (
    select
      count(*)::bigint as response_count,
      coalesce(avg(score),0)::numeric as avg_response_score
    from public.battle_responses
    where challenge_id = p_challenge_id::text
  ),
  ratings as (
    select
      coalesce(avg(rating),0)::numeric as rating_average,
      count(*)::bigint as rating_count
    from public.battle_challenge_ratings
    where challenge_id = p_challenge_id
  )
  select
    responses.response_count,
    round(responses.avg_response_score,1),
    round(ratings.rating_average,2),
    ratings.rating_count,
    round(least(100::numeric,
      least(responses.response_count::numeric * 5, 100) * 0.30 +
      responses.avg_response_score * 0.30 +
      (ratings.rating_average / 5.0 * 100) * 0.30 +
      case when ratings.rating_count >= 3 then 10 else ratings.rating_count * (10.0/3.0) end
    ),1)
  from responses cross join ratings;
$$;

grant execute on function public.battle_user_challenge_metrics(uuid) to anon, authenticated;
