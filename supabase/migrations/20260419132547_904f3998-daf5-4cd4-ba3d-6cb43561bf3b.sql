-- =====================================================
-- BARIBA VOICE LAB — Tables, RLS, Storage, Triggers
-- =====================================================

-- 1. Table des phrases sources
CREATE TABLE public.bariba_corpus_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_bariba text NOT NULL,
  text_french text,
  category text NOT NULL,
  source text,
  word_count int NOT NULL DEFAULT 0,
  difficulty text NOT NULL DEFAULT 'easy',
  is_active boolean NOT NULL DEFAULT true,
  recordings_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_phrases_category_active 
  ON public.bariba_corpus_phrases(category) WHERE is_active;
CREATE INDEX idx_phrases_recordings_count 
  ON public.bariba_corpus_phrases(recordings_count) WHERE is_active;
CREATE UNIQUE INDEX uq_phrases_text_normalized 
  ON public.bariba_corpus_phrases(LOWER(text_bariba));

ALTER TABLE public.bariba_corpus_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Phrases visible par utilisateurs connectés"
  ON public.bariba_corpus_phrases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins peuvent insérer phrases"
  ON public.bariba_corpus_phrases FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins peuvent modifier phrases"
  ON public.bariba_corpus_phrases FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins peuvent supprimer phrases"
  ON public.bariba_corpus_phrases FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_phrases_updated_at
  BEFORE UPDATE ON public.bariba_corpus_phrases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Table des enregistrements audio
CREATE TABLE public.bariba_voice_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase_id uuid NOT NULL REFERENCES public.bariba_corpus_phrases(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  duration_seconds numeric,
  mime_type text,
  file_size_bytes int,
  validated boolean NOT NULL DEFAULT false,
  rejected boolean NOT NULL DEFAULT false,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, phrase_id)
);

CREATE INDEX idx_recordings_user ON public.bariba_voice_recordings(user_id);
CREATE INDEX idx_recordings_phrase ON public.bariba_voice_recordings(phrase_id);
CREATE INDEX idx_recordings_created ON public.bariba_voice_recordings(created_at DESC);

ALTER TABLE public.bariba_voice_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users voient leurs propres enregistrements"
  ON public.bariba_voice_recordings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insèrent leurs propres enregistrements"
  ON public.bariba_voice_recordings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins modifient enregistrements"
  ON public.bariba_voice_recordings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users ou admins suppriment enregistrements"
  ON public.bariba_voice_recordings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_recordings_updated_at
  BEFORE UPDATE ON public.bariba_voice_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Trigger : maintenir recordings_count
CREATE OR REPLACE FUNCTION public.update_phrase_recordings_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.bariba_corpus_phrases
      SET recordings_count = recordings_count + 1
      WHERE id = NEW.phrase_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.bariba_corpus_phrases
      SET recordings_count = GREATEST(recordings_count - 1, 0)
      WHERE id = OLD.phrase_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_phrase_recordings_count
  AFTER INSERT OR DELETE ON public.bariba_voice_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_phrase_recordings_count();

-- 4. Storage bucket privé
INSERT INTO storage.buckets (id, name, public)
VALUES ('bariba-voice-corpus', 'bariba-voice-corpus', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Policies storage
CREATE POLICY "Users uploadent dans leur dossier voice-corpus"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bariba-voice-corpus'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users lisent leurs propres fichiers voice-corpus"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bariba-voice-corpus'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Users suppriment leurs propres fichiers voice-corpus"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bariba-voice-corpus'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Admins modifient fichiers voice-corpus"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bariba-voice-corpus'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );