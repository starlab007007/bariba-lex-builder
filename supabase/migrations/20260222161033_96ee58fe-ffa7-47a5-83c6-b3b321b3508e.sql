
-- Create video_engagements table for behavioral signal tracking
CREATE TABLE public.video_engagements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watch_duration_ms integer DEFAULT 0,
  video_duration_ms integer DEFAULT 0,
  completed boolean DEFAULT false,
  replayed boolean DEFAULT false,
  swipe_speed_ms integer,
  interaction_type text DEFAULT 'view',
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast aggregation queries
CREATE INDEX idx_video_engagements_video_id ON public.video_engagements(video_id);
CREATE INDEX idx_video_engagements_user_id ON public.video_engagements(user_id);
CREATE INDEX idx_video_engagements_session ON public.video_engagements(session_id);
CREATE INDEX idx_video_engagements_created ON public.video_engagements(created_at DESC);

-- Enable RLS
ALTER TABLE public.video_engagements ENABLE ROW LEVEL SECURITY;

-- Anyone can insert engagements (including anonymous)
CREATE POLICY "Anyone can insert engagements"
ON public.video_engagements FOR INSERT
WITH CHECK (true);

-- Users can view their own engagements
CREATE POLICY "Users can view own engagements"
ON public.video_engagements FOR SELECT
USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- Admins can read all engagements
CREATE POLICY "Admins can read all engagements"
ON public.video_engagements FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_engagements;
