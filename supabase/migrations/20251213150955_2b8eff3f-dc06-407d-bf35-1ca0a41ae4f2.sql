-- 1. Drop the old YOVO trigger with CASCADE
DROP TRIGGER IF EXISTS on_auth_user_created_yovo ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_yovo_user() CASCADE;

-- 2. Recreate the trigger function for tamtam_profiles
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
    'user_' || substr(NEW.id::text, 1, 8), 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'Nouvel utilisateur'),
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone_number')
  );
  RETURN NEW;
END;
$$;

-- 3. Create the new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tamtam_user();

-- 4. Fix storage policies for tamtam-audio bucket
DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tamtam-audio');

DROP POLICY IF EXISTS "Public can read tamtam-audio" ON storage.objects;
CREATE POLICY "Public can read tamtam-audio"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tamtam-audio');

DROP POLICY IF EXISTS "Users can update own audio" ON storage.objects;
CREATE POLICY "Users can update own audio"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'tamtam-audio')
WITH CHECK (bucket_id = 'tamtam-audio');

DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;
CREATE POLICY "Users can delete own audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'tamtam-audio');