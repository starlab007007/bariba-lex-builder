
-- Table 1: Conte Vivant Stories (le conte interactif avec son graphe DAG)
CREATE TABLE public.conte_vivant_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  languages TEXT[] DEFAULT ARRAY['fr']::TEXT[],
  graph JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  total_segments INT DEFAULT 0,
  total_endings INT DEFAULT 0,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: Progression utilisateur
CREATE TABLE public.conte_vivant_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_id UUID NOT NULL REFERENCES public.conte_vivant_stories(id) ON DELETE CASCADE,
  path_taken TEXT[] DEFAULT ARRAY[]::TEXT[],
  choices JSONB DEFAULT '[]'::JSONB,
  endings_unlocked TEXT[] DEFAULT ARRAY[]::TEXT[],
  completed_at TIMESTAMPTZ,
  replay_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, story_id)
);

-- Table 3: Votes communautaires
CREATE TABLE public.conte_vivant_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.conte_vivant_stories(id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL,
  results JSONB DEFAULT '{}'::JSONB,
  winner VARCHAR(255),
  voter_count INT DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS pour conte_vivant_stories
ALTER TABLE public.conte_vivant_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published stories"
  ON public.conte_vivant_stories FOR SELECT
  USING (status = 'published');

CREATE POLICY "Creators can read their own stories"
  ON public.conte_vivant_stories FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own stories"
  ON public.conte_vivant_stories FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own stories"
  ON public.conte_vivant_stories FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own stories"
  ON public.conte_vivant_stories FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS pour conte_vivant_progress
ALTER TABLE public.conte_vivant_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own progress"
  ON public.conte_vivant_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.conte_vivant_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.conte_vivant_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
  ON public.conte_vivant_progress FOR DELETE
  USING (auth.uid() = user_id);

-- RLS pour conte_vivant_votes
ALTER TABLE public.conte_vivant_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read votes"
  ON public.conte_vivant_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert votes"
  ON public.conte_vivant_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update votes"
  ON public.conte_vivant_votes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Enable realtime for votes (community mode)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conte_vivant_votes;

-- Trigger updated_at pour stories
CREATE TRIGGER update_conte_vivant_stories_updated_at
  BEFORE UPDATE ON public.conte_vivant_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger updated_at pour progress
CREATE TRIGGER update_conte_vivant_progress_updated_at
  BEFORE UPDATE ON public.conte_vivant_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
