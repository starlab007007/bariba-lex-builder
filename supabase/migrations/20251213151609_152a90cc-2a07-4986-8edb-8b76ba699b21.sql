-- 1. Drop old constraint if exists (renamed table still has old constraint name)
ALTER TABLE public.tamtam_profiles DROP CONSTRAINT IF EXISTS yovo_profiles_username_key;

-- 2. Add new unique constraint with correct name
ALTER TABLE public.tamtam_profiles ADD CONSTRAINT tamtam_profiles_username_key UNIQUE (username);

-- 3. Update trigger function to use full UUID for guaranteed uniqueness
CREATE OR REPLACE FUNCTION public.handle_new_tamtam_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.tamtam_profiles (user_id, username, display_name, phone_number)
  VALUES (
    NEW.id, 
    'user_' || replace(NEW.id::text, '-', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'Nouvel utilisateur'),
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone_number')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;