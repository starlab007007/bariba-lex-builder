-- Table des corrigés officiels créés par les enseignants
CREATE TABLE IF NOT EXISTS public.classe_answer_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('N1', 'N2')),
  module text NOT NULL,
  lesson_id text NOT NULL,
  section_key text NOT NULL DEFAULT '',
  question_idx integer NOT NULL DEFAULT 0,
  question_text text,
  accepted_answers text[] NOT NULL DEFAULT ARRAY[]::text[],
  explanation text,
  audio_url text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (level, module, lesson_id, section_key, question_idx)
);

CREATE INDEX IF NOT EXISTS idx_answer_keys_lookup
  ON public.classe_answer_keys (level, module, lesson_id);

ALTER TABLE public.classe_answer_keys ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur connecté
CREATE POLICY "Authenticated can read answer keys"
  ON public.classe_answer_keys FOR SELECT
  TO authenticated
  USING (true);

-- Écriture : enseignants et admins uniquement
CREATE POLICY "Teachers manage answer keys insert"
  ON public.classe_answer_keys FOR INSERT
  TO authenticated
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Teachers manage answer keys update"
  ON public.classe_answer_keys FOR UPDATE
  TO authenticated
  USING (public.is_teacher_or_admin(auth.uid()))
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Teachers manage answer keys delete"
  ON public.classe_answer_keys FOR DELETE
  TO authenticated
  USING (public.is_teacher_or_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_classe_answer_keys_updated_at
  BEFORE UPDATE ON public.classe_answer_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();