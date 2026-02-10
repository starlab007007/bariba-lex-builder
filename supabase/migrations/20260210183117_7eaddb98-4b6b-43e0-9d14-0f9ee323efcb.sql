-- Video processing jobs for server-side enhancement pipeline
CREATE TABLE public.video_processing_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  renditions JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own jobs
CREATE POLICY "Users can view their own processing jobs"
ON public.video_processing_jobs FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create processing jobs"
ON public.video_processing_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Users can update their own processing jobs"
ON public.video_processing_jobs FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_video_processing_jobs_updated_at
BEFORE UPDATE ON public.video_processing_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();