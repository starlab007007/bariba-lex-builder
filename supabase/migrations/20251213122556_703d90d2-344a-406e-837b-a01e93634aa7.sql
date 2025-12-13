-- 1. Enrichir yovo_posts pour multimédia et transcriptions
ALTER TABLE yovo_posts 
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'audio',
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS transcript_fr TEXT,
  ADD COLUMN IF NOT EXISTS transcript_ba TEXT,
  ADD COLUMN IF NOT EXISTS hashtags TEXT[],
  ADD COLUMN IF NOT EXISTS feeling_emoji TEXT;

-- 2. Créer table commentaires audio
CREATE TABLE IF NOT EXISTS tamtam_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES yovo_posts(id) ON DELETE CASCADE,
  user_id UUID,
  audio_url TEXT NOT NULL,
  transcript_fr TEXT,
  transcript_ba TEXT,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Créer table réactions enrichies
CREATE TABLE IF NOT EXISTS tamtam_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES yovo_posts(id) ON DELETE CASCADE,
  user_id UUID,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'pray')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 4. Créer table stories vocales éphémères
CREATE TABLE IF NOT EXISTS tamtam_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  audio_url TEXT NOT NULL,
  photo_url TEXT,
  transcript_fr TEXT,
  transcript_ba TEXT,
  duration_seconds INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE tamtam_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamtam_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamtam_stories ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies pour tamtam_comments
CREATE POLICY "Comments are viewable by everyone"
  ON tamtam_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own comments"
  ON tamtam_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON tamtam_comments FOR DELETE
  USING (auth.uid() = user_id);

-- 7. RLS Policies pour tamtam_reactions
CREATE POLICY "Reactions are viewable by everyone"
  ON tamtam_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own reactions"
  ON tamtam_reactions FOR ALL
  USING (auth.uid() = user_id);

-- 8. RLS Policies pour tamtam_stories
CREATE POLICY "Active stories are viewable by everyone"
  ON tamtam_stories FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Users can manage their own stories"
  ON tamtam_stories FOR ALL
  USING (auth.uid() = user_id);

-- 9. Index pour performances
CREATE INDEX IF NOT EXISTS idx_tamtam_comments_post_id ON tamtam_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_tamtam_reactions_post_id ON tamtam_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_tamtam_stories_expires_at ON tamtam_stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_tamtam_stories_user_id ON tamtam_stories(user_id);