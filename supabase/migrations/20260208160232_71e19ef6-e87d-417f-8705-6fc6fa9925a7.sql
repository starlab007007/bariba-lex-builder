-- Step 1: Drop old constraint
ALTER TABLE public.anime_scene_library DROP CONSTRAINT anime_scene_library_time_of_day_check;

-- Step 2: Map old granular values to simplified ones
UPDATE public.anime_scene_library SET time_of_day = 'day' WHERE time_of_day IN ('morning', 'noon', 'afternoon');

-- Step 3: Add new constraint with simplified values matching frontend
ALTER TABLE public.anime_scene_library ADD CONSTRAINT anime_scene_library_time_of_day_check 
  CHECK (time_of_day = ANY (ARRAY['day'::text, 'night'::text, 'dawn'::text, 'dusk'::text]));