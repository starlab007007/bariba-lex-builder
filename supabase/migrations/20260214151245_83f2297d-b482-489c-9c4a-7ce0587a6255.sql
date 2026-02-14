
-- Table pour tracker les contributions et points des utilisateurs
CREATE TABLE public.user_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour requêtes par utilisateur
CREATE INDEX idx_user_contributions_user_id ON public.user_contributions(user_id);

-- RLS
ALTER TABLE public.user_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own contributions"
ON public.user_contributions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert contributions"
ON public.user_contributions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-award points when word_submissions is inserted
CREATE OR REPLACE FUNCTION public.award_contribution_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_points INTEGER := 10;
BEGIN
  -- Bonus for audio
  IF NEW.audio_url IS NOT NULL AND NEW.audio_url != '' THEN
    total_points := total_points + 5;
  END IF;
  
  -- Bonus for example
  IF NEW.example IS NOT NULL AND NEW.example != '' THEN
    total_points := total_points + 3;
  END IF;

  INSERT INTO public.user_contributions (user_id, action_type, points, reference_id)
  VALUES (NEW.user_id, 'word_submission', total_points, NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_word_submission_award_points
AFTER INSERT ON public.word_submissions
FOR EACH ROW
EXECUTE FUNCTION public.award_contribution_points();
