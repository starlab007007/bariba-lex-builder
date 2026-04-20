CREATE INDEX IF NOT EXISTS idx_videos_public_created ON public.videos(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_engagements_video_id ON public.video_engagements(video_id);
CREATE INDEX IF NOT EXISTS idx_classe_content_audios_key_status ON public.classe_content_audios(content_key, status, is_current);