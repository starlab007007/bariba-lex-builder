-- 1. Add UNIQUE constraint on user_id for ON CONFLICT to work
ALTER TABLE public.tamtam_profiles 
ADD CONSTRAINT tamtam_profiles_user_id_key UNIQUE (user_id);

-- 2. Rename old primary key constraint to tamtam naming
ALTER INDEX IF EXISTS yovo_profiles_pkey RENAME TO tamtam_profiles_pkey;

-- 3. Rename old foreign key constraint to tamtam naming
ALTER TABLE public.tamtam_profiles 
RENAME CONSTRAINT yovo_profiles_user_id_fkey TO tamtam_profiles_user_id_fkey;