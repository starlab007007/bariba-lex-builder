-- Create enum for user roles
create type public.app_role as enum ('admin', 'user');

-- Table for user roles (SECURITY CRITICAL)
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    created_at timestamptz default now(),
    unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- RLS policies for user_roles
create policy "Admins can view all roles"
on public.user_roles for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Users can view own role"
on public.user_roles for select
to authenticated
using (user_id = auth.uid());

-- Table for dictionary entries (editable dictionary)
create table public.dictionary_entries (
    id uuid primary key default gen_random_uuid(),
    word text not null,
    definition text not null,
    phonetic text,
    part_of_speech text,
    french_keywords text[],
    example_bariba text[],
    example_francais text[],
    variants text[],
    quality_score numeric(5,2) default 0.0,
    is_verified boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);

alter table public.dictionary_entries enable row level security;

-- RLS: Anyone can read dictionary
create policy "Anyone can read dictionary"
on public.dictionary_entries for select
to anon, authenticated
using (true);

-- RLS: Only admins can modify dictionary
create policy "Admins can modify dictionary"
on public.dictionary_entries for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Table for training phrases
create table public.training_phrases (
    id uuid primary key default gen_random_uuid(),
    french_text text not null,
    bariba_text text not null,
    source text default 'manual',
    quality_score numeric(5,2),
    is_validated boolean default false,
    metadata jsonb,
    created_at timestamptz default now(),
    created_by uuid references auth.users(id)
);

alter table public.training_phrases enable row level security;

create policy "Anyone can read training phrases"
on public.training_phrases for select
to authenticated using (true);

create policy "Admins can manage training phrases"
on public.training_phrases for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Table for translation logs (performance tracking)
create table public.translation_logs (
    id uuid primary key default gen_random_uuid(),
    input_text text not null,
    output_text text not null,
    source_language text not null,
    target_language text not null,
    confidence_score numeric(5,2),
    model_version text,
    user_id uuid references auth.users(id),
    created_at timestamptz default now()
);

alter table public.translation_logs enable row level security;

create policy "Admins can view all logs"
on public.translation_logs for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Users can view own logs"
on public.translation_logs for select
to authenticated
using (user_id = auth.uid());

-- Table for model performance metrics
create table public.model_performance (
    id uuid primary key default gen_random_uuid(),
    model_version text not null,
    metric_name text not null,
    metric_value numeric(10,4),
    metadata jsonb,
    recorded_at timestamptz default now()
);

alter table public.model_performance enable row level security;

create policy "Admins can view model performance"
on public.model_performance for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert model performance"
on public.model_performance for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger for dictionary_entries
create trigger update_dictionary_entries_updated_at
before update on public.dictionary_entries
for each row
execute function public.update_updated_at_column();

-- Create indexes for better performance
create index idx_dictionary_entries_word on public.dictionary_entries(word);
create index idx_dictionary_entries_quality on public.dictionary_entries(quality_score);
create index idx_training_phrases_validated on public.training_phrases(is_validated);
create index idx_translation_logs_created_at on public.translation_logs(created_at);
create index idx_translation_logs_user on public.translation_logs(user_id);
create index idx_model_performance_version on public.model_performance(model_version);