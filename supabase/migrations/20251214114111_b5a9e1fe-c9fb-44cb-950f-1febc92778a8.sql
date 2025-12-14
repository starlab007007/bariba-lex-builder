-- Create story views tracking table
CREATE TABLE IF NOT EXISTS public.tamtam_story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.tamtam_stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id),
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.tamtam_story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view story views" ON public.tamtam_story_views
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can record views" ON public.tamtam_story_views
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Index for performance
CREATE INDEX idx_story_views_story_id ON public.tamtam_story_views(story_id);
CREATE INDEX idx_story_views_viewer_id ON public.tamtam_story_views(viewer_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tamtam_story_views;