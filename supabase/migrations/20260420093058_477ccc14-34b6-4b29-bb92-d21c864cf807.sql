-- =========================================================
-- Table classe_content_audios
-- =========================================================
CREATE TABLE public.classe_content_audios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN (
    'text','question','phonetic','word','exercise','instruction','title','answer'
  )),
  content_text text NOT NULL,
  level text NOT NULL CHECK (level IN ('N1','N2')),
  module text NOT NULL CHECK (module IN (
    'lang','calcul','eval','gestion','grammaire','textprod'
  )),
  lesson_id int,
  section_key text,
  item_index int,
  hierarchy_label text,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  duration_seconds numeric,
  peak_db numeric,
  rms_db numeric,
  quality_score int CHECK (quality_score BETWEEN 0 AND 100),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','approved','rejected'
  )),
  admin_id uuid REFERENCES auth.users(id),
  admin_notes text,
  reviewed_at timestamptz,
  version int NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cca_content_key_current ON public.classe_content_audios (content_key) WHERE is_current = true;
CREATE INDEX idx_cca_content_key ON public.classe_content_audios (content_key);
CREATE INDEX idx_cca_teacher_status ON public.classe_content_audios (teacher_id, status);
CREATE INDEX idx_cca_level_module_lesson ON public.classe_content_audios (level, module, lesson_id);
CREATE INDEX idx_cca_status ON public.classe_content_audios (status);
-- One approved current version per content_key
CREATE UNIQUE INDEX uniq_cca_approved_current ON public.classe_content_audios (content_key) WHERE is_current = true AND status = 'approved';

-- =========================================================
-- Trigger: versioning + updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.classe_content_audios_handle_versioning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_version int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(MAX(version), 0) INTO max_version
      FROM public.classe_content_audios
      WHERE content_key = NEW.content_key;
    NEW.version := max_version + 1;
    -- Demote previous currents
    UPDATE public.classe_content_audios
      SET is_current = false, updated_at = now()
      WHERE content_key = NEW.content_key AND is_current = true;
    NEW.is_current := true;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cca_versioning
BEFORE INSERT ON public.classe_content_audios
FOR EACH ROW EXECUTE FUNCTION public.classe_content_audios_handle_versioning();

CREATE TRIGGER trg_cca_updated_at
BEFORE UPDATE ON public.classe_content_audios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.classe_content_audios ENABLE ROW LEVEL SECURITY;

-- Teachers: SELECT own
CREATE POLICY "Teachers view own audios"
ON public.classe_content_audios FOR SELECT TO authenticated
USING (teacher_id = auth.uid());

-- All authenticated: SELECT approved+current
CREATE POLICY "Anyone authenticated views approved current audios"
ON public.classe_content_audios FOR SELECT TO authenticated
USING (status = 'approved' AND is_current = true);

-- Admins: SELECT all
CREATE POLICY "Admins view all audios"
ON public.classe_content_audios FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Teachers: INSERT own (must be teacher or admin)
CREATE POLICY "Teachers insert own audios"
ON public.classe_content_audios FOR INSERT TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND public.is_teacher_or_admin(auth.uid())
  AND status IN ('draft','submitted')
);

-- Teachers: UPDATE own while not finalized
CREATE POLICY "Teachers update own pending audios"
ON public.classe_content_audios FOR UPDATE TO authenticated
USING (teacher_id = auth.uid() AND status IN ('draft','submitted'))
WITH CHECK (teacher_id = auth.uid() AND status IN ('draft','submitted'));

-- Admins: UPDATE all (review/approve/reject)
CREATE POLICY "Admins update all audios"
ON public.classe_content_audios FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Teachers: DELETE own drafts only
CREATE POLICY "Teachers delete own drafts"
ON public.classe_content_audios FOR DELETE TO authenticated
USING (teacher_id = auth.uid() AND status = 'draft');

-- Admins: DELETE all
CREATE POLICY "Admins delete audios"
ON public.classe_content_audios FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- Storage bucket
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('classe-audio', 'classe-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
-- Teachers upload to their own folder: {teacher_id}/...
CREATE POLICY "Teachers upload own classe audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classe-audio'
  AND public.is_teacher_or_admin(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Teachers read their own files
CREATE POLICY "Teachers read own classe audio"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classe-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Teachers update/delete own files
CREATE POLICY "Teachers update own classe audio"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'classe-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Teachers delete own classe audio"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'classe-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins full access
CREATE POLICY "Admins manage all classe audio"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'classe-audio'
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'classe-audio'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Authenticated users read approved files (matched via DB lookup)
CREATE POLICY "Authenticated read approved classe audio"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classe-audio'
  AND EXISTS (
    SELECT 1 FROM public.classe_content_audios cca
    WHERE cca.storage_path = storage.objects.name
      AND cca.status = 'approved'
      AND cca.is_current = true
  )
);