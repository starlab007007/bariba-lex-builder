-- Ajouter colonnes audio à dictionary_feedback
ALTER TABLE public.dictionary_feedback 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_transcription TEXT,
ADD COLUMN IF NOT EXISTS audio_transcription_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS source_language TEXT DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS feedback_source TEXT DEFAULT 'text';

-- Créer la table word_submissions pour les nouveaux mots proposés
CREATE TABLE IF NOT EXISTS public.word_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  word TEXT NOT NULL,
  phonetic TEXT,
  definition TEXT NOT NULL,
  part_of_speech TEXT DEFAULT 'n',
  example_bariba TEXT,
  example_francais TEXT,
  audio_word_url TEXT,
  audio_definition_url TEXT,
  audio_example_url TEXT,
  transcription_confidence NUMERIC,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS sur word_submissions
ALTER TABLE public.word_submissions ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres soumissions
CREATE POLICY "Users can view own submissions" 
ON public.word_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer des soumissions
CREATE POLICY "Users can create submissions" 
ON public.word_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Politique: Les admins peuvent tout gérer
CREATE POLICY "Admins can manage all submissions" 
ON public.word_submissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Politique: Tout le monde peut voir les soumissions approuvées
CREATE POLICY "Anyone can view approved submissions" 
ON public.word_submissions 
FOR SELECT 
USING (status = 'approved');

-- Trigger pour updated_at
CREATE TRIGGER update_word_submissions_updated_at
BEFORE UPDATE ON public.word_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();