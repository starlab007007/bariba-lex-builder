CREATE TABLE IF NOT EXISTS public.keyboard_learned_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  last_used timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);

ALTER TABLE public.keyboard_learned_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learned words"
  ON public.keyboard_learned_words FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learned words"
  ON public.keyboard_learned_words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learned words"
  ON public.keyboard_learned_words FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learned words"
  ON public.keyboard_learned_words FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_keyboard_learned_words_user_count
  ON public.keyboard_learned_words(user_id, count DESC, last_used DESC);