-- Update the handle_new_tamtam_user function to generate readable usernames
CREATE OR REPLACE FUNCTION public.handle_new_tamtam_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_username text;
  final_username text;
  counter integer := 0;
BEGIN
  -- Use display_name to generate username, sanitize it
  base_username := COALESCE(
    LOWER(REGEXP_REPLACE(
      TRIM(COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')), 
      '[^a-zA-Z0-9_]', '_', 'g'
    )),
    ''
  );
  
  -- If empty or too short, use a short prefix from user ID
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user_' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6);
  END IF;
  
  -- Truncate if too long
  IF LENGTH(base_username) > 20 THEN
    base_username := SUBSTRING(base_username, 1, 20);
  END IF;
  
  -- Generate unique username
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.tamtam_profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter;
  END LOOP;
  
  INSERT INTO public.tamtam_profiles (user_id, username, display_name, phone_number)
  VALUES (
    NEW.id, 
    final_username,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'Nouvel utilisateur'),
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone_number')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update existing usernames to use display_name (only for auto-generated ones)
UPDATE tamtam_profiles 
SET username = LOWER(REGEXP_REPLACE(TRIM(display_name), '[^a-zA-Z0-9_]', '_', 'g'))
WHERE username LIKE 'user_%' 
  AND LENGTH(username) > 15
  AND display_name IS NOT NULL 
  AND display_name != 'Nouvel utilisateur'
  AND LENGTH(TRIM(display_name)) >= 3;