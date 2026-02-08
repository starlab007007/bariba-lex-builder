-- Add foreign key from videos.user_id to tamtam_profiles.user_id
-- This enables joining video data with creator profiles
ALTER TABLE public.videos
ADD CONSTRAINT videos_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.tamtam_profiles(user_id)
ON DELETE SET NULL;