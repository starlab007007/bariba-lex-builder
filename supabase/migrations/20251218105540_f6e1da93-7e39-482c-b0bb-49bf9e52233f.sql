-- 1. Enrich tamtam_messages with media types
ALTER TABLE tamtam_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'audio';
ALTER TABLE tamtam_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE tamtam_messages ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE tamtam_messages ADD COLUMN IF NOT EXISTS emoji_code TEXT;
ALTER TABLE tamtam_messages ADD COLUMN IF NOT EXISTS text_content TEXT;
ALTER TABLE tamtam_messages ADD COLUMN IF NOT EXISTS transcript_ba TEXT;
ALTER TABLE tamtam_messages ADD COLUMN IF NOT EXISTS transcript_fr TEXT;

-- 2. Enhance tamtam_groups as communities
ALTER TABLE tamtam_groups ADD COLUMN IF NOT EXISTS voice_description_url TEXT;
ALTER TABLE tamtam_groups ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE tamtam_groups ADD COLUMN IF NOT EXISTS rules_audio_url TEXT;
ALTER TABLE tamtam_groups ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- 3. Create community messages table
CREATE TABLE IF NOT EXISTS tamtam_community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES tamtam_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_type TEXT DEFAULT 'audio',
  audio_url TEXT,
  media_url TEXT,
  transcript_ba TEXT,
  transcript_fr TEXT,
  emoji_code TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on community messages
ALTER TABLE tamtam_community_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for community messages
CREATE POLICY "Community messages are viewable by everyone" ON tamtam_community_messages
  FOR SELECT USING (true);

CREATE POLICY "Members can post to communities" ON tamtam_community_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can delete their messages" ON tamtam_community_messages
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Create live streaming tables
CREATE TABLE IF NOT EXISTS tamtam_lives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES tamtam_profiles(user_id),
  community_id UUID REFERENCES tamtam_groups(id),
  title TEXT NOT NULL,
  title_audio_url TEXT,
  status TEXT DEFAULT 'live',
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE tamtam_lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lives are viewable by everyone" ON tamtam_lives
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own lives" ON tamtam_lives
  FOR ALL USING (auth.uid() = host_id);

-- Live viewers table
CREATE TABLE IF NOT EXISTS tamtam_live_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES tamtam_lives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tamtam_live_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers are viewable by everyone" ON tamtam_live_viewers
  FOR SELECT USING (true);

CREATE POLICY "Users can join/leave lives" ON tamtam_live_viewers
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Live reactions table
CREATE TABLE IF NOT EXISTS tamtam_live_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES tamtam_lives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tamtam_live_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable by everyone" ON tamtam_live_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can react to lives" ON tamtam_live_reactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Friend suggestions table
CREATE TABLE IF NOT EXISTS tamtam_friend_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  suggested_user_id UUID NOT NULL,
  reason TEXT,
  mutual_friends_count INTEGER DEFAULT 0,
  score DECIMAL DEFAULT 0,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tamtam_friend_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suggestions" ON tamtam_friend_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss suggestions" ON tamtam_friend_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE tamtam_community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tamtam_lives;
ALTER PUBLICATION supabase_realtime ADD TABLE tamtam_live_viewers;
ALTER PUBLICATION supabase_realtime ADD TABLE tamtam_live_reactions;