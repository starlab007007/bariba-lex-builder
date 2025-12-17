-- Table pour les blocages d'utilisateurs
CREATE TABLE IF NOT EXISTS public.tamtam_user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.tamtam_user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON public.tamtam_user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON public.tamtam_user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock" ON public.tamtam_user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Table pour les signalements de contenu
CREATE TABLE IF NOT EXISTS public.tamtam_content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  reported_post_id UUID,
  reported_comment_id UUID,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tamtam_content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.tamtam_content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.tamtam_content_reports
  FOR SELECT USING (auth.uid() = reporter_id);