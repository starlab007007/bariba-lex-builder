-- 1. Add 'teacher' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

-- Wait for enum value to be committed before using it in functions
COMMIT;

-- 2. Helper security definer function: is_teacher_or_admin
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('teacher'::app_role, 'admin'::app_role)
  )
$$;

-- 3. Table: classe_student_progress
CREATE TABLE IF NOT EXISTS public.classe_student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('N1','N2')),
  completed_lessons integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  lesson_stars jsonb NOT NULL DEFAULT '{}'::jsonb,
  tabs_completed jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_lesson_id integer,
  theme_badges text[] NOT NULL DEFAULT ARRAY[]::text[],
  extra_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, level)
);

ALTER TABLE public.classe_student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own progress"
  ON public.classe_student_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students insert own progress"
  ON public.classe_student_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students update own progress"
  ON public.classe_student_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers and admins view all progress"
  ON public.classe_student_progress FOR SELECT
  USING (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Admins manage all progress"
  ON public.classe_student_progress FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_classe_student_progress_user ON public.classe_student_progress(user_id);
CREATE INDEX idx_classe_student_progress_level ON public.classe_student_progress(level);

-- 4. Table: classe_student_answers
CREATE TABLE IF NOT EXISTS public.classe_student_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('N1','N2')),
  module text NOT NULL CHECK (module IN ('lesson','calcul','evaluation','gestion','grammaire','textprod')),
  lesson_id text NOT NULL,
  section_key text NOT NULL DEFAULT '',
  question_idx integer NOT NULL DEFAULT 0,
  answer_text text,
  field_data jsonb,
  score numeric,
  max_score numeric,
  teacher_grade numeric CHECK (teacher_grade IS NULL OR (teacher_grade >= 0 AND teacher_grade <= 20)),
  teacher_comment text CHECK (teacher_comment IS NULL OR length(teacher_comment) <= 2000),
  graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, level, module, lesson_id, section_key, question_idx)
);

ALTER TABLE public.classe_student_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own answers"
  ON public.classe_student_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students insert own answers"
  ON public.classe_student_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students update own answers (not graded fields)"
  ON public.classe_student_answers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers view all answers"
  ON public.classe_student_answers FOR SELECT
  USING (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Teachers grade answers"
  ON public.classe_student_answers FOR UPDATE
  USING (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Admins delete answers"
  ON public.classe_student_answers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_classe_answers_user ON public.classe_student_answers(user_id);
CREATE INDEX idx_classe_answers_module ON public.classe_student_answers(module, level);
CREATE INDEX idx_classe_answers_pending ON public.classe_student_answers(graded_at) WHERE graded_at IS NULL;

-- Trigger to prevent students from modifying teacher-only fields
CREATE OR REPLACE FUNCTION public.protect_teacher_fields_classe_answers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_teacher_or_admin(auth.uid()) THEN
    NEW.teacher_grade := OLD.teacher_grade;
    NEW.teacher_comment := OLD.teacher_comment;
    NEW.graded_by := OLD.graded_by;
    NEW.graded_at := OLD.graded_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_classe_answers
  BEFORE UPDATE ON public.classe_student_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_teacher_fields_classe_answers();

CREATE TRIGGER trg_classe_progress_updated
  BEFORE UPDATE ON public.classe_student_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Table: classe_evaluation_results
CREATE TABLE IF NOT EXISTS public.classe_evaluation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('N1','N2')),
  evaluation_id text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  best_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 20,
  attempts integer NOT NULL DEFAULT 1,
  details jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, level, evaluation_id)
);

ALTER TABLE public.classe_evaluation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own evals"
  ON public.classe_evaluation_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students insert own evals"
  ON public.classe_evaluation_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students update own evals"
  ON public.classe_evaluation_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers view all evals"
  ON public.classe_evaluation_results FOR SELECT
  USING (public.is_teacher_or_admin(auth.uid()));

CREATE POLICY "Admins manage evals"
  ON public.classe_evaluation_results FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_classe_evals_updated
  BEFORE UPDATE ON public.classe_evaluation_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Table: classe_teacher_assignments
CREATE TABLE IF NOT EXISTS public.classe_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text CHECK (level IS NULL OR level IN ('N1','N2')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(teacher_id, student_id, level)
);

ALTER TABLE public.classe_teacher_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view own assignments"
  ON public.classe_teacher_assignments FOR SELECT
  USING (auth.uid() = teacher_id OR auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage assignments"
  ON public.classe_teacher_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_teacher_assignments_teacher ON public.classe_teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_student ON public.classe_teacher_assignments(student_id);