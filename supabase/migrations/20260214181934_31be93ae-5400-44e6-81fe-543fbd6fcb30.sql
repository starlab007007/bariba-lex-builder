-- Create table to store learning content edits by editors
CREATE TABLE public.learning_content_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID NOT NULL,
  lesson_id TEXT NOT NULL,
  section_index INTEGER,
  quiz_index INTEGER,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('edit', 'delete', 'validate')),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reverted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_content_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can insert edits"
ON public.learning_content_edits
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Editors can view edits"
ON public.learning_content_edits
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage edits"
ON public.learning_content_edits
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can update edits"
ON public.learning_content_edits
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin')
);
