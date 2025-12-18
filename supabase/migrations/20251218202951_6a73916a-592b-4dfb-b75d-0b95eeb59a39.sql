-- Table principale des sondages
CREATE TABLE public.tamtam_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question_audio_url TEXT NOT NULL,
  question_transcript TEXT,
  expires_at TIMESTAMPTZ,
  is_anonymous BOOLEAN DEFAULT false,
  votes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Options de chaque sondage
CREATE TABLE public.tamtam_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.tamtam_polls(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  transcript TEXT,
  vote_count INTEGER DEFAULT 0,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Votes (pour éviter les doublons)
CREATE TABLE public.tamtam_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.tamtam_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.tamtam_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tamtam_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamtam_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamtam_poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls policies
CREATE POLICY "Anyone can read polls" ON public.tamtam_polls FOR SELECT USING (true);
CREATE POLICY "Users can create polls" ON public.tamtam_polls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own polls" ON public.tamtam_polls FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own polls" ON public.tamtam_polls FOR UPDATE USING (auth.uid() = user_id);

-- Poll options policies
CREATE POLICY "Anyone can read poll options" ON public.tamtam_poll_options FOR SELECT USING (true);
CREATE POLICY "Poll owners can insert options" ON public.tamtam_poll_options FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.tamtam_polls WHERE id = poll_id AND user_id = auth.uid()));
CREATE POLICY "Poll owners can delete options" ON public.tamtam_poll_options FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.tamtam_polls WHERE id = poll_id AND user_id = auth.uid()));

-- Poll votes policies
CREATE POLICY "Anyone can see votes" ON public.tamtam_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.tamtam_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their vote" ON public.tamtam_poll_votes FOR DELETE USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tamtam_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tamtam_poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tamtam_poll_votes;