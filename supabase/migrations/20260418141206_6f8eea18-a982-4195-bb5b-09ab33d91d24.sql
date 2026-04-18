-- Table des poids de notation
CREATE TABLE public.classe_grade_weights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL,
  module text NOT NULL,
  lesson_id text NOT NULL,
  section_key text NOT NULL DEFAULT '',
  question_idx integer NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 1.0,
  section_weight numeric NOT NULL DEFAULT 1.0,
  lesson_weight numeric NOT NULL DEFAULT 1.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE(level, module, lesson_id, section_key, question_idx)
);

ALTER TABLE public.classe_grade_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read grade weights"
  ON public.classe_grade_weights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers manage weights insert"
  ON public.classe_grade_weights FOR INSERT
  TO authenticated
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Teachers manage weights update"
  ON public.classe_grade_weights FOR UPDATE
  TO authenticated
  USING (public.is_teacher_or_admin(auth.uid()))
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Teachers manage weights delete"
  ON public.classe_grade_weights FOR DELETE
  TO authenticated
  USING (public.is_teacher_or_admin(auth.uid()));

CREATE TRIGGER trg_grade_weights_updated_at
  BEFORE UPDATE ON public.classe_grade_weights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_grade_weights_lookup
  ON public.classe_grade_weights(level, module, lesson_id, section_key);

-- Table des chapitres
CREATE TABLE public.classe_chapters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL,
  chapter_key text NOT NULL,
  title_fr text NOT NULL,
  title_ba text,
  lesson_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(level, chapter_key)
);

ALTER TABLE public.classe_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read chapters"
  ON public.classe_chapters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers manage chapters insert"
  ON public.classe_chapters FOR INSERT
  TO authenticated
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Teachers manage chapters update"
  ON public.classe_chapters FOR UPDATE
  TO authenticated
  USING (public.is_teacher_or_admin(auth.uid()))
  WITH CHECK (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Teachers manage chapters delete"
  ON public.classe_chapters FOR DELETE
  TO authenticated
  USING (public.is_teacher_or_admin(auth.uid()));

CREATE TRIGGER trg_chapters_updated_at
  BEFORE UPDATE ON public.classe_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table d'auto-évaluation apprenant
CREATE TABLE public.classe_self_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  level text NOT NULL,
  module text NOT NULL,
  lesson_id text NOT NULL,
  confidence_grade numeric NOT NULL DEFAULT 10,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, level, module, lesson_id)
);

ALTER TABLE public.classe_self_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own self-assessments"
  ON public.classe_self_assessments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers view all self-assessments"
  ON public.classe_self_assessments FOR SELECT
  TO authenticated
  USING (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Students insert own self-assessments"
  ON public.classe_self_assessments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students update own self-assessments"
  ON public.classe_self_assessments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students delete own self-assessments"
  ON public.classe_self_assessments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_self_assessments_updated_at
  BEFORE UPDATE ON public.classe_self_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_self_assessments_user
  ON public.classe_self_assessments(user_id, level);