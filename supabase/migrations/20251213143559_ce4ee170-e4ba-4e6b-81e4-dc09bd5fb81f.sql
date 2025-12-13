
-- =====================================================
-- PHASE 1: RENAME ALL YOVO TABLES TO TAMTAM
-- =====================================================

-- Rename main tables
ALTER TABLE IF EXISTS yovo_profiles RENAME TO tamtam_profiles;
ALTER TABLE IF EXISTS yovo_posts RENAME TO tamtam_posts;
ALTER TABLE IF EXISTS yovo_messages RENAME TO tamtam_messages;
ALTER TABLE IF EXISTS yovo_rooms RENAME TO tamtam_rooms;
ALTER TABLE IF EXISTS yovo_groups RENAME TO tamtam_groups;
ALTER TABLE IF EXISTS yovo_jobs RENAME TO tamtam_jobs;
ALTER TABLE IF EXISTS yovo_products RENAME TO tamtam_products;
ALTER TABLE IF EXISTS yovo_emergency_contacts RENAME TO tamtam_emergency_contacts;

-- =====================================================
-- PHASE 2: ADD PHONE AUTH + SOCIAL COLUMNS TO PROFILES
-- =====================================================

ALTER TABLE tamtam_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;
ALTER TABLE tamtam_profiles ADD COLUMN IF NOT EXISTS bio_transcript_fr TEXT;
ALTER TABLE tamtam_profiles ADD COLUMN IF NOT EXISTS bio_transcript_ba TEXT;
ALTER TABLE tamtam_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE tamtam_profiles ADD COLUMN IF NOT EXISTS friends_count INTEGER DEFAULT 0;

-- =====================================================
-- PHASE 3: CREATE SOCIAL TABLES
-- =====================================================

-- Table de suivi (follows)
CREATE TABLE IF NOT EXISTS tamtam_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Table d'amitiés
CREATE TABLE IF NOT EXISTS tamtam_friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(requester_id, addressee_id)
);

-- Membres des groupes/communautés
CREATE TABLE IF NOT EXISTS tamtam_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Publications dans les groupes
CREATE TABLE IF NOT EXISTS tamtam_group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'audio',
  media_url TEXT,
  transcript_fr TEXT,
  transcript_ba TEXT,
  feeling_emoji TEXT,
  duration_seconds INTEGER,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partages
CREATE TABLE IF NOT EXISTS tamtam_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  shared_to TEXT DEFAULT 'timeline' CHECK (shared_to IN ('timeline', 'message', 'group', 'external')),
  message_audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Favoris/Bookmarks
CREATE TABLE IF NOT EXISTS tamtam_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Notifications vocales
CREATE TABLE IF NOT EXISTS tamtam_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'friend_request', 'friend_accepted', 'mention', 'group_invite', 'message', 'share')),
  actor_id UUID,
  post_id UUID,
  group_id UUID,
  audio_description_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PHASE 4: ENABLE RLS ON ALL NEW TABLES
-- =====================================================

ALTER TABLE tamtam_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamtam_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamtam_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamtam_group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamtam_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamtam_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamtam_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 5: CREATE RLS POLICIES
-- =====================================================

-- Follows policies
CREATE POLICY "Follows viewable by everyone" ON tamtam_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON tamtam_follows FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can unfollow" ON tamtam_follows FOR DELETE USING (auth.uid() IS NOT NULL);

-- Friendships policies
CREATE POLICY "Friendships viewable by participants" ON tamtam_friendships FOR SELECT USING (true);
CREATE POLICY "Users can send friend requests" ON tamtam_friendships FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their friendships" ON tamtam_friendships FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete friendships" ON tamtam_friendships FOR DELETE USING (auth.uid() IS NOT NULL);

-- Group members policies
CREATE POLICY "Group members viewable by everyone" ON tamtam_group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON tamtam_group_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can leave groups" ON tamtam_group_members FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update members" ON tamtam_group_members FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Group posts policies
CREATE POLICY "Group posts viewable by everyone" ON tamtam_group_posts FOR SELECT USING (true);
CREATE POLICY "Members can create group posts" ON tamtam_group_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can update group posts" ON tamtam_group_posts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can delete group posts" ON tamtam_group_posts FOR DELETE USING (auth.uid() IS NOT NULL);

-- Shares policies
CREATE POLICY "Shares viewable by everyone" ON tamtam_shares FOR SELECT USING (true);
CREATE POLICY "Users can share posts" ON tamtam_shares FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete shares" ON tamtam_shares FOR DELETE USING (auth.uid() IS NOT NULL);

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON tamtam_bookmarks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can add bookmarks" ON tamtam_bookmarks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can remove bookmarks" ON tamtam_bookmarks FOR DELETE USING (auth.uid() IS NOT NULL);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON tamtam_notifications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can create notifications" ON tamtam_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON tamtam_notifications FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own notifications" ON tamtam_notifications FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- PHASE 6: CREATE TAMTAM-AUDIO STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('tamtam-audio', 'tamtam-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tamtam-audio bucket
CREATE POLICY "Tamtam audio publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'tamtam-audio');
CREATE POLICY "Users can upload tamtam audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tamtam-audio' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own tamtam audio" ON storage.objects FOR UPDATE USING (bucket_id = 'tamtam-audio' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own tamtam audio" ON storage.objects FOR DELETE USING (bucket_id = 'tamtam-audio' AND auth.uid() IS NOT NULL);

-- =====================================================
-- PHASE 7: UPDATE TRIGGER FUNCTION
-- =====================================================

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to use tamtam_profiles
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
    NEW.phone
  );
  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER on_auth_user_created_tamtam
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tamtam_user();

-- =====================================================
-- PHASE 8: ENABLE REALTIME ON SOCIAL TABLES
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE tamtam_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE tamtam_friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE tamtam_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE tamtam_group_posts;
