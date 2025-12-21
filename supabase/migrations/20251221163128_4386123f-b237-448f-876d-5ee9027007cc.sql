-- Create translation history table for persistent storage
CREATE TABLE public.translation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language TEXT NOT NULL CHECK (source_language IN ('bariba', 'french')),
  target_language TEXT NOT NULL CHECK (target_language IN ('bariba', 'french')),
  input_mode TEXT NOT NULL DEFAULT 'text',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  confidence_score NUMERIC(3,2),
  context_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.translation_history ENABLE ROW LEVEL SECURITY;

-- Policy for public access (anonymous users can create/read their session data)
CREATE POLICY "Anyone can insert translation history" 
ON public.translation_history 
FOR INSERT 
WITH CHECK (true);

-- Policy for reading - users can read their own translations or by session
CREATE POLICY "Users can read own translations" 
ON public.translation_history 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Policy for updating favorites - only for authenticated users
CREATE POLICY "Users can update own favorites" 
ON public.translation_history 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for deleting - only authenticated users can delete their translations
CREATE POLICY "Users can delete own translations" 
ON public.translation_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_translation_history_user ON public.translation_history(user_id);
CREATE INDEX idx_translation_history_session ON public.translation_history(session_id);
CREATE INDEX idx_translation_history_favorite ON public.translation_history(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_translation_history_created ON public.translation_history(created_at DESC);

-- Full text search index for source and translated text
CREATE INDEX idx_translation_history_search ON public.translation_history 
USING GIN (to_tsvector('french', source_text || ' ' || translated_text));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.translation_history;