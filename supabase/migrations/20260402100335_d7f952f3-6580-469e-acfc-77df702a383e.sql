
CREATE TABLE public.security_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  answers_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own security answers"
ON public.security_answers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security answers"
ON public.security_answers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own security answers"
ON public.security_answers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all security answers"
ON public.security_answers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
