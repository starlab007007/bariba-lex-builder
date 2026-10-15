-- Public UI translations only; no messages, documents or user recordings.
CREATE TABLE public.platform_locale_overrides (
  id text PRIMARY KEY CHECK (id ~ '^[0-9a-f]{16}$'),
  fr text NOT NULL CHECK (length(btrim(fr)) BETWEEN 1 AND 4000),
  ba text NOT NULL CHECK (length(btrim(ba)) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_locale_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_locale_overrides FROM anon, authenticated;
GRANT SELECT ON public.platform_locale_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_locale_overrides TO authenticated;
CREATE POLICY "Published UI translations" ON public.platform_locale_overrides
  FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Administrators manage UI translations" ON public.platform_locale_overrides
  FOR ALL TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE INDEX platform_locale_overrides_published_idx ON public.platform_locale_overrides(id) WHERE status='approved';
CREATE FUNCTION public.platform_locale_stamp() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.revision := CASE WHEN TG_OP = 'UPDATE' THEN OLD.revision + 1 ELSE 1 END;
  NEW.updated_at := now();
  NEW.reviewed_by := CASE WHEN NEW.status = 'approved' THEN auth.uid() ELSE NULL END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_locale_stamp() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER platform_locale_stamp BEFORE INSERT OR UPDATE ON public.platform_locale_overrides
  FOR EACH ROW EXECUTE FUNCTION public.platform_locale_stamp();
COMMENT ON TABLE public.platform_locale_overrides IS 'Native-reviewed platform UI translations; private user content is never inserted by the localization layer.';
