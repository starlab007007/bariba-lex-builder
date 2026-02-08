
-- Create table for music library tracks (uploaded via admin)
CREATE TABLE public.music_library_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  artist text DEFAULT 'TAM-TAM',
  category text NOT NULL DEFAULT 'traditional',
  mood text NOT NULL DEFAULT 'calm',
  duration real DEFAULT 0,
  bpm integer,
  description_fr text,
  tags jsonb DEFAULT '[]'::jsonb,
  audio_url text NOT NULL,
  storage_path text NOT NULL,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_library_tracks ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read music tracks"
ON public.music_library_tracks
FOR SELECT
USING (true);

-- Admin write access
CREATE POLICY "Admins can manage music tracks"
ON public.music_library_tracks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
