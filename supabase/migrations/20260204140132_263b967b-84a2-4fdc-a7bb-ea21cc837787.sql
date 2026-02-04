-- Create griot_drafts table for Cloud drafts storage
CREATE TABLE public.griot_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  style TEXT,
  duration INTEGER DEFAULT 30,
  audio_url TEXT,
  scenes JSONB,
  narrator_avatar_url TEXT,
  step TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.griot_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own drafts
CREATE POLICY "Users can view their own drafts"
  ON public.griot_drafts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own drafts
CREATE POLICY "Users can create their own drafts"
  ON public.griot_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update their own drafts"
  ON public.griot_drafts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete their own drafts"
  ON public.griot_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_griot_drafts_updated_at
  BEFORE UPDATE ON public.griot_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();