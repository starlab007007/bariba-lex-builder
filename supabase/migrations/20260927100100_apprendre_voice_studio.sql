-- =====================================================================
-- FITILA Apprendre — voix de référence, validation et publication
--   * catalogue des textes bariba du module Apprendre (clé audio stable)
--   * prises des locuteurs, avis des validateurs, activation par l'admin
--   * consentements, lots, signalements, paramètres, journal d'audit
--   * vue publique des audios actifs + bucket privé « apprendre-audio »
-- Règle clé : un locuteur ne valide jamais sa propre prise, et une prise
-- n'est audible que si son empreinte de texte correspond au texte actuel.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Fonctions d'habilitation
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apprendre_is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.apprendre_can_review(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'voice_reviewer'::app_role) OR public.has_role(_uid, 'admin'::app_role)
$$;

-- apprendre_can_speak est créée plus bas, après la table des consentements.

-- ---------------------------------------------------------------------
-- 2. Paramètres (une seule ligne)
-- ---------------------------------------------------------------------
CREATE TABLE public.apprendre_audio_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auto_activate boolean NOT NULL DEFAULT false,
  approvals_required int NOT NULL DEFAULT 1 CHECK (approvals_required BETWEEN 1 AND 3),
  default_variant text NOT NULL DEFAULT 'nikki',
  allow_tts_fallback boolean NOT NULL DEFAULT false,
  min_quality_score int NOT NULL DEFAULT 60 CHECK (min_quality_score BETWEEN 0 AND 100),
  compare_very_close int NOT NULL DEFAULT 80 CHECK (compare_very_close BETWEEN 0 AND 100),
  compare_close int NOT NULL DEFAULT 60 CHECK (compare_close BETWEEN 0 AND 100),
  -- Distance moyenne des sons (MFCC alignés) jugée « identique » / « très différente ».
  -- Valeurs provisoires : à recalculer avec tool/audio_catalog/calibrate_compare.py sur le pilote.
  compare_mfcc_good numeric NOT NULL DEFAULT 5 CHECK (compare_mfcc_good > 0),
  compare_mfcc_bad numeric NOT NULL DEFAULT 14 CHECK (compare_mfcc_bad > 0),
  consent_version text NOT NULL DEFAULT '2026-09-v1',
  consent_text text NOT NULL DEFAULT
    'J''accepte que ma voix soit enregistrée et diffusée dans le module Apprendre de FITILA '
    'comme voix de référence du bàátɔ̀nú. Je peux retirer mon accord à tout moment : mes '
    'enregistrements sont alors retirés de l''application. L''usage de ma voix pour entraîner '
    'les modèles vocaux de FITILA fait l''objet d''un accord séparé.',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
INSERT INTO public.apprendre_audio_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Catalogue des textes (alimenté par tool/audio_catalog/build_audio_catalog.py)
-- ---------------------------------------------------------------------
CREATE TABLE public.apprendre_audio_items (
  audio_key text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('mot', 'forme', 'exemple', 'lecon', 'scene', 'proverbe')),
  text_ba text NOT NULL,
  text_fr text,
  text_hash text NOT NULL,
  source_page int,
  ref text,
  pack text NOT NULL,
  priority int NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 9),
  content_version text NOT NULL,
  in_content boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aai_pack ON public.apprendre_audio_items (pack);
CREATE INDEX idx_aai_kind_priority ON public.apprendre_audio_items (kind, priority);

-- ---------------------------------------------------------------------
-- 4. Consentements des contributeurs
-- ---------------------------------------------------------------------
CREATE TABLE public.apprendre_voice_consents (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  display_name text,
  show_name boolean NOT NULL DEFAULT false,
  allow_ai_training boolean NOT NULL DEFAULT false,
  voice text NOT NULL DEFAULT 'femme' CHECK (voice IN ('femme', 'homme')),
  variant text NOT NULL DEFAULT 'nikki',
  signed_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. Prises
-- ---------------------------------------------------------------------
CREATE TABLE public.apprendre_audio_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_key text NOT NULL REFERENCES public.apprendre_audio_items(audio_key) ON DELETE CASCADE,
  text_hash text NOT NULL,
  speaker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice text NOT NULL CHECK (voice IN ('femme', 'homme')),
  variant text NOT NULL DEFAULT 'nikki',
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL DEFAULT 'audio/wav',
  duration_ms int CHECK (duration_ms IS NULL OR duration_ms > 0),
  peak_db numeric,
  rms_db numeric,
  snr_db numeric,
  silence_ratio numeric,
  quality_score int CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'needs_fix', 'withdrawn')),
  approvals int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  version int NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  activated_at timestamptz,
  activated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT is_active OR status = 'approved')
);
CREATE INDEX idx_aat_key ON public.apprendre_audio_takes (audio_key);
CREATE INDEX idx_aat_status ON public.apprendre_audio_takes (status);
CREATE INDEX idx_aat_speaker ON public.apprendre_audio_takes (speaker_id, status);
CREATE UNIQUE INDEX uniq_aat_active_voice
  ON public.apprendre_audio_takes (audio_key, voice) WHERE is_active;

-- ---------------------------------------------------------------------
-- 6. Avis des validateurs
-- ---------------------------------------------------------------------
CREATE TABLE public.apprendre_audio_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  take_id uuid NOT NULL REFERENCES public.apprendre_audio_takes(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject', 'needs_fix')),
  score_clarity int CHECK (score_clarity IS NULL OR score_clarity BETWEEN 1 AND 5),
  score_tone int CHECK (score_tone IS NULL OR score_tone BETWEEN 1 AND 5),
  score_natural int CHECK (score_natural IS NULL OR score_natural BETWEEN 1 AND 5),
  score_noise int CHECK (score_noise IS NULL OR score_noise BETWEEN 1 AND 5),
  reason text CHECK (reason IS NULL OR reason IN
    ('bruit', 'coupure', 'mauvais_mot', 'ton_douteux', 'texte_errone', 'volume', 'autre')),
  tone_confirmed boolean NOT NULL DEFAULT false,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (take_id, reviewer_id)
);
CREATE INDEX idx_aar_take ON public.apprendre_audio_reviews (take_id);

-- ---------------------------------------------------------------------
-- 7. Lots d'enregistrement
-- ---------------------------------------------------------------------
CREATE TABLE public.apprendre_audio_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  speaker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  voice text NOT NULL DEFAULT 'femme' CHECK (voice IN ('femme', 'homme')),
  audio_keys text[] NOT NULL,
  filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aaa_speaker ON public.apprendre_audio_assignments (speaker_id, status);

-- ---------------------------------------------------------------------
-- 8. Signalements de texte
-- ---------------------------------------------------------------------
CREATE TABLE public.apprendre_text_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_key text NOT NULL REFERENCES public.apprendre_audio_items(audio_key) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('texte', 'ton', 'traduction', 'autre')),
  detail text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fixed', 'dismissed')),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ati_status ON public.apprendre_text_issues (status);

-- ---------------------------------------------------------------------
-- 9. Journal d'audit
-- ---------------------------------------------------------------------
CREATE TABLE public.apprendre_audio_audit (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  target text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aaud_created ON public.apprendre_audio_audit (created_at DESC);

CREATE OR REPLACE FUNCTION public.apprendre_audit(_action text, _target text, _detail jsonb)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.apprendre_audio_audit (actor_id, action, target, detail)
  VALUES (auth.uid(), _action, _target, COALESCE(_detail, '{}'::jsonb))
$$;

-- Locuteur habilité : rôle Locuteur voix (ou admin) et consentement en cours.
CREATE OR REPLACE FUNCTION public.apprendre_can_speak(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.has_role(_uid, 'voice_speaker'::app_role) OR public.has_role(_uid, 'admin'::app_role))
     AND EXISTS (
       SELECT 1 FROM public.apprendre_voice_consents c
       WHERE c.user_id = _uid AND c.withdrawn_at IS NULL
     )
$$;

-- ---------------------------------------------------------------------
-- 10. Déclencheurs : dates, versions, texte modifié
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_aai_updated_at BEFORE UPDATE ON public.apprendre_audio_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_aat_updated_at BEFORE UPDATE ON public.apprendre_audio_takes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_aaa_updated_at BEFORE UPDATE ON public.apprendre_audio_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_avc_updated_at BEFORE UPDATE ON public.apprendre_voice_consents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.apprendre_takes_version()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM public.apprendre_audio_takes
    WHERE audio_key = NEW.audio_key AND speaker_id = NEW.speaker_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_aat_version BEFORE INSERT ON public.apprendre_audio_takes
FOR EACH ROW EXECUTE FUNCTION public.apprendre_takes_version();

-- Un texte modifié désactive ses audios : la voix ne dit plus le texte affiché.
CREATE OR REPLACE FUNCTION public.apprendre_items_text_changed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  IF NEW.text_hash IS DISTINCT FROM OLD.text_hash THEN
    UPDATE public.apprendre_audio_takes
       SET is_active = false
     WHERE audio_key = NEW.audio_key AND is_active AND text_hash <> NEW.text_hash;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      INSERT INTO public.apprendre_audio_audit (actor_id, action, target, detail)
      VALUES (auth.uid(), 'deactivate_text_changed', NEW.audio_key,
              jsonb_build_object('old_text', OLD.text_ba, 'new_text', NEW.text_ba, 'takes', n));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_aai_text_changed AFTER UPDATE ON public.apprendre_audio_items
FOR EACH ROW EXECUTE FUNCTION public.apprendre_items_text_changed();

-- ---------------------------------------------------------------------
-- 11. Actions (fonctions appelées par l'application et l'administration)
-- ---------------------------------------------------------------------

-- Signature ou mise à jour du consentement par le contributeur lui-même.
CREATE OR REPLACE FUNCTION public.apprendre_sign_consent(
  _display_name text, _show_name boolean, _allow_ai_training boolean,
  _voice text, _variant text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;
  SELECT consent_version INTO v FROM public.apprendre_audio_settings WHERE id = 1;
  INSERT INTO public.apprendre_voice_consents
    (user_id, consent_version, display_name, show_name, allow_ai_training, voice, variant, signed_at, withdrawn_at)
  VALUES (auth.uid(), v, _display_name, COALESCE(_show_name, false), COALESCE(_allow_ai_training, false),
          COALESCE(_voice, 'femme'), COALESCE(_variant, 'nikki'), now(), NULL)
  ON CONFLICT (user_id) DO UPDATE SET
    consent_version = EXCLUDED.consent_version,
    display_name = EXCLUDED.display_name,
    show_name = EXCLUDED.show_name,
    allow_ai_training = EXCLUDED.allow_ai_training,
    voice = EXCLUDED.voice,
    variant = EXCLUDED.variant,
    signed_at = now(),
    withdrawn_at = NULL;
  PERFORM public.apprendre_audit('consent_signed', auth.uid()::text,
    jsonb_build_object('version', v, 'ai', _allow_ai_training, 'show_name', _show_name));
END;
$$;

-- Retrait du consentement : toutes les voix du contributeur quittent l'application.
CREATE OR REPLACE FUNCTION public.apprendre_withdraw_consent()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.apprendre_voice_consents SET withdrawn_at = now() WHERE user_id = auth.uid();
  UPDATE public.apprendre_audio_takes
     SET is_active = false, status = 'withdrawn'
   WHERE speaker_id = auth.uid();
  PERFORM public.apprendre_audit('consent_withdrawn', auth.uid()::text, '{}'::jsonb);
END;
$$;

-- Soumission d'une prise (après contrôle de qualité sur le téléphone).
CREATE OR REPLACE FUNCTION public.apprendre_submit_take(_take_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.apprendre_audio_takes%ROWTYPE;
  s public.apprendre_audio_settings%ROWTYPE;
  current_hash text;
BEGIN
  SELECT * INTO t FROM public.apprendre_audio_takes WHERE id = _take_id FOR UPDATE;
  IF NOT FOUND OR t.speaker_id <> auth.uid() THEN
    RAISE EXCEPTION 'Prise introuvable';
  END IF;
  IF NOT public.apprendre_can_speak(auth.uid()) THEN
    RAISE EXCEPTION 'Rôle Locuteur voix et consentement requis';
  END IF;
  IF t.status NOT IN ('draft', 'needs_fix') THEN
    RAISE EXCEPTION 'Cette prise ne peut plus être soumise (statut %)', t.status;
  END IF;
  SELECT * INTO s FROM public.apprendre_audio_settings WHERE id = 1;
  IF COALESCE(t.quality_score, 0) < s.min_quality_score THEN
    RAISE EXCEPTION 'Qualité insuffisante (% sur %)', COALESCE(t.quality_score, 0), s.min_quality_score;
  END IF;
  SELECT text_hash INTO current_hash FROM public.apprendre_audio_items WHERE audio_key = t.audio_key;
  IF current_hash IS DISTINCT FROM t.text_hash THEN
    RAISE EXCEPTION 'Le texte a changé depuis l''enregistrement';
  END IF;
  UPDATE public.apprendre_audio_takes
     SET status = 'submitted', submitted_at = now(), approvals = 0
   WHERE id = _take_id;
  PERFORM public.apprendre_audit('take_submitted', _take_id::text, jsonb_build_object('key', t.audio_key));
END;
$$;

-- Activation interne (non exposée) : utilisée par l'admin et par la règle d'activation automatique.
CREATE OR REPLACE FUNCTION public.apprendre_activate_internal(_take_id uuid, _active boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.apprendre_audio_takes%ROWTYPE;
  current_hash text;
BEGIN
  SELECT * INTO t FROM public.apprendre_audio_takes WHERE id = _take_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prise introuvable';
  END IF;
  IF NOT _active THEN
    UPDATE public.apprendre_audio_takes SET is_active = false WHERE id = _take_id;
    PERFORM public.apprendre_audit('take_deactivated', _take_id::text, jsonb_build_object('key', t.audio_key));
    RETURN;
  END IF;
  IF t.status <> 'approved' THEN
    RAISE EXCEPTION 'Seule une prise approuvée peut être activée';
  END IF;
  SELECT text_hash INTO current_hash FROM public.apprendre_audio_items WHERE audio_key = t.audio_key;
  IF current_hash IS DISTINCT FROM t.text_hash THEN
    RAISE EXCEPTION 'Le texte a changé : cette prise est obsolète';
  END IF;
  UPDATE public.apprendre_audio_takes
     SET is_active = false
   WHERE audio_key = t.audio_key AND voice = t.voice AND is_active AND id <> _take_id;
  UPDATE public.apprendre_audio_takes
     SET is_active = true, activated_at = now(), activated_by = auth.uid()
   WHERE id = _take_id;
  PERFORM public.apprendre_audit('take_activated', _take_id::text,
    jsonb_build_object('key', t.audio_key, 'voice', t.voice));
END;
$$;

-- Activation (ou retrait) d'une prise approuvée par l'administration.
CREATE OR REPLACE FUNCTION public.apprendre_activate_take(_take_id uuid, _active boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.apprendre_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé à l''administration';
  END IF;
  PERFORM public.apprendre_activate_internal(_take_id, _active);
END;
$$;

-- Avis d'un validateur. Refusé si le validateur est l'auteur de la prise.
CREATE OR REPLACE FUNCTION public.apprendre_review_take(
  _take_id uuid, _decision text,
  _score_clarity int, _score_tone int, _score_natural int, _score_noise int,
  _reason text, _tone_confirmed boolean, _comment text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.apprendre_audio_takes%ROWTYPE;
  s public.apprendre_audio_settings%ROWTYPE;
  n_approve int;
  new_status text;
BEGIN
  IF NOT public.apprendre_can_review(auth.uid()) THEN
    RAISE EXCEPTION 'Rôle Validateur voix requis';
  END IF;
  SELECT * INTO t FROM public.apprendre_audio_takes WHERE id = _take_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prise introuvable';
  END IF;
  IF t.speaker_id = auth.uid() THEN
    RAISE EXCEPTION 'Un locuteur ne valide pas sa propre prise';
  END IF;
  IF t.status <> 'submitted' THEN
    RAISE EXCEPTION 'Cette prise n''est pas en attente de validation (statut %)', t.status;
  END IF;
  IF _decision NOT IN ('approve', 'reject', 'needs_fix') THEN
    RAISE EXCEPTION 'Décision inconnue';
  END IF;
  IF _decision <> 'approve' AND _reason IS NULL THEN
    RAISE EXCEPTION 'Un motif est requis pour un rejet ou une correction';
  END IF;

  INSERT INTO public.apprendre_audio_reviews
    (take_id, reviewer_id, decision, score_clarity, score_tone, score_natural, score_noise,
     reason, tone_confirmed, comment)
  VALUES (_take_id, auth.uid(), _decision, _score_clarity, _score_tone, _score_natural, _score_noise,
          _reason, COALESCE(_tone_confirmed, false), _comment)
  ON CONFLICT (take_id, reviewer_id) DO UPDATE SET
    decision = EXCLUDED.decision,
    score_clarity = EXCLUDED.score_clarity,
    score_tone = EXCLUDED.score_tone,
    score_natural = EXCLUDED.score_natural,
    score_noise = EXCLUDED.score_noise,
    reason = EXCLUDED.reason,
    tone_confirmed = EXCLUDED.tone_confirmed,
    comment = EXCLUDED.comment,
    created_at = now();

  SELECT * INTO s FROM public.apprendre_audio_settings WHERE id = 1;
  new_status := 'submitted';
  IF _decision = 'reject' THEN
    new_status := 'rejected';
  ELSIF _decision = 'needs_fix' THEN
    new_status := 'needs_fix';
  ELSE
    SELECT count(*) INTO n_approve FROM public.apprendre_audio_reviews
      WHERE take_id = _take_id AND decision = 'approve';
    UPDATE public.apprendre_audio_takes SET approvals = n_approve WHERE id = _take_id;
    IF n_approve >= s.approvals_required THEN
      new_status := 'approved';
    END IF;
  END IF;

  UPDATE public.apprendre_audio_takes
     SET status = new_status,
         reviewed_at = CASE WHEN new_status <> 'submitted' THEN now() ELSE reviewed_at END
   WHERE id = _take_id;
  PERFORM public.apprendre_audit('take_reviewed', _take_id::text,
    jsonb_build_object('key', t.audio_key, 'decision', _decision, 'reason', _reason, 'status', new_status));

  IF new_status = 'approved' AND s.auto_activate THEN
    PERFORM public.apprendre_activate_internal(_take_id, true);
  END IF;
  RETURN new_status;
END;
$$;

-- Import du catalogue (JSON produit par le script du dépôt), par paquets.
CREATE OR REPLACE FUNCTION public.apprendre_import_catalog(_items jsonb, _content_version text, _final boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_upsert int;
  n_retired int := 0;
BEGIN
  IF NOT public.apprendre_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé à l''administration';
  END IF;
  INSERT INTO public.apprendre_audio_items
    (audio_key, kind, text_ba, text_fr, text_hash, source_page, ref, pack, priority, content_version, in_content)
  SELECT i->>'key', i->>'kind', i->>'ba', i->>'fr', i->>'hash',
         NULLIF(i->>'page', '')::int, i->>'ref', i->>'pack',
         COALESCE(NULLIF(i->>'priority', '')::int, 5), _content_version, true
  FROM jsonb_array_elements(_items) AS i
  ON CONFLICT (audio_key) DO UPDATE SET
    kind = EXCLUDED.kind,
    text_ba = EXCLUDED.text_ba,
    text_fr = EXCLUDED.text_fr,
    text_hash = EXCLUDED.text_hash,
    source_page = EXCLUDED.source_page,
    ref = EXCLUDED.ref,
    pack = EXCLUDED.pack,
    priority = EXCLUDED.priority,
    content_version = EXCLUDED.content_version,
    in_content = true;
  GET DIAGNOSTICS n_upsert = ROW_COUNT;
  IF _final THEN
    UPDATE public.apprendre_audio_items
       SET in_content = false
     WHERE content_version <> _content_version AND in_content;
    GET DIAGNOSTICS n_retired = ROW_COUNT;
  END IF;
  PERFORM public.apprendre_audit('catalog_import', _content_version,
    jsonb_build_object('items', n_upsert, 'retired', n_retired, 'final', _final));
  RETURN jsonb_build_object('items', n_upsert, 'retired', n_retired);
END;
$$;

-- Chiffres du tableau de bord.
CREATE OR REPLACE FUNCTION public.apprendre_audio_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.apprendre_is_admin(auth.uid()) OR public.apprendre_can_review(auth.uid())) THEN
    RAISE EXCEPTION 'Accès réservé';
  END IF;
  SELECT jsonb_build_object(
    'items', (SELECT count(*) FROM public.apprendre_audio_items WHERE in_content),
    'covered', (SELECT count(DISTINCT t.audio_key)
                  FROM public.apprendre_audio_takes t
                  JOIN public.apprendre_audio_items i ON i.audio_key = t.audio_key
                 WHERE t.is_active AND i.in_content AND t.text_hash = i.text_hash),
    'by_kind', (SELECT COALESCE(jsonb_object_agg(kind, jsonb_build_object('total', total, 'covered', covered)), '{}'::jsonb)
                  FROM (SELECT i.kind, count(*) AS total,
                               count(*) FILTER (WHERE EXISTS (
                                 SELECT 1 FROM public.apprendre_audio_takes t
                                 WHERE t.audio_key = i.audio_key AND t.is_active AND t.text_hash = i.text_hash)) AS covered
                          FROM public.apprendre_audio_items i WHERE i.in_content GROUP BY i.kind) k),
    'by_status', (SELECT COALESCE(jsonb_object_agg(status, n), '{}'::jsonb)
                    FROM (SELECT status, count(*) AS n FROM public.apprendre_audio_takes GROUP BY status) s),
    'reject_reasons', (SELECT COALESCE(jsonb_object_agg(reason, n), '{}'::jsonb)
                         FROM (SELECT reason, count(*) AS n FROM public.apprendre_audio_reviews
                               WHERE reason IS NOT NULL GROUP BY reason) r),
    'avg_review_hours', (SELECT round(avg(extract(epoch FROM (reviewed_at - submitted_at)) / 3600)::numeric, 1)
                           FROM public.apprendre_audio_takes
                          WHERE reviewed_at IS NOT NULL AND submitted_at IS NOT NULL),
    'open_issues', (SELECT count(*) FROM public.apprendre_text_issues WHERE status IN ('open', 'in_progress')),
    'speakers', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
                   SELECT t.speaker_id, c.display_name, c.voice, c.variant,
                          count(*) AS takes,
                          count(*) FILTER (WHERE t.status = 'approved') AS approved,
                          count(*) FILTER (WHERE t.status = 'rejected') AS rejected
                     FROM public.apprendre_audio_takes t
                     LEFT JOIN public.apprendre_voice_consents c ON c.user_id = t.speaker_id
                    GROUP BY t.speaker_id, c.display_name, c.voice, c.variant
                    ORDER BY count(*) DESC) x)
  ) INTO result;
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------
-- 12. Vue publique : ce que l'application Apprendre peut jouer
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.apprendre_audio_published AS
SELECT t.audio_key,
       t.voice,
       t.variant,
       t.storage_path,
       t.duration_ms,
       t.text_hash,
       t.activated_at,
       CASE WHEN c.show_name THEN c.display_name ELSE NULL END AS speaker_name
  FROM public.apprendre_audio_takes t
  JOIN public.apprendre_audio_items i ON i.audio_key = t.audio_key AND i.text_hash = t.text_hash
  LEFT JOIN public.apprendre_voice_consents c ON c.user_id = t.speaker_id
 WHERE t.is_active
   AND i.in_content
   AND (c.user_id IS NULL OR c.withdrawn_at IS NULL);

GRANT SELECT ON public.apprendre_audio_published TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 13. Sécurité par lignes
-- ---------------------------------------------------------------------
ALTER TABLE public.apprendre_audio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprendre_audio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprendre_voice_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprendre_audio_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprendre_audio_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprendre_audio_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprendre_text_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apprendre_audio_audit ENABLE ROW LEVEL SECURITY;

-- Paramètres : lus par tous (seuils de comparaison), modifiés par l'admin.
CREATE POLICY "Anyone reads apprendre audio settings" ON public.apprendre_audio_settings
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update apprendre audio settings" ON public.apprendre_audio_settings
FOR UPDATE TO authenticated
USING (public.apprendre_is_admin(auth.uid())) WITH CHECK (public.apprendre_is_admin(auth.uid()));

-- Catalogue : lecture publique, écriture par l'admin (ou via apprendre_import_catalog).
CREATE POLICY "Anyone reads apprendre audio items" ON public.apprendre_audio_items
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage apprendre audio items" ON public.apprendre_audio_items
FOR ALL TO authenticated
USING (public.apprendre_is_admin(auth.uid())) WITH CHECK (public.apprendre_is_admin(auth.uid()));

-- Consentements : chacun voit le sien ; l'admin et les validateurs voient tout.
CREATE POLICY "Users read own voice consent" ON public.apprendre_voice_consents
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.apprendre_is_admin(auth.uid()) OR public.apprendre_can_review(auth.uid()));

-- Prises
CREATE POLICY "Speakers read own takes" ON public.apprendre_audio_takes
FOR SELECT TO authenticated USING (speaker_id = auth.uid());
CREATE POLICY "Reviewers read submitted takes" ON public.apprendre_audio_takes
FOR SELECT TO authenticated
USING (status <> 'draft' AND public.apprendre_can_review(auth.uid()));
CREATE POLICY "Admins read all takes" ON public.apprendre_audio_takes
FOR SELECT TO authenticated USING (public.apprendre_is_admin(auth.uid()));
CREATE POLICY "Speakers insert own drafts" ON public.apprendre_audio_takes
FOR INSERT TO authenticated
WITH CHECK (speaker_id = auth.uid() AND status = 'draft' AND NOT is_active
            AND public.apprendre_can_speak(auth.uid()));
CREATE POLICY "Speakers update own drafts" ON public.apprendre_audio_takes
FOR UPDATE TO authenticated
USING (speaker_id = auth.uid() AND status IN ('draft', 'needs_fix'))
WITH CHECK (speaker_id = auth.uid() AND status IN ('draft', 'needs_fix') AND NOT is_active);
CREATE POLICY "Speakers delete own drafts" ON public.apprendre_audio_takes
FOR DELETE TO authenticated USING (speaker_id = auth.uid() AND status = 'draft');
CREATE POLICY "Admins delete takes" ON public.apprendre_audio_takes
FOR DELETE TO authenticated USING (public.apprendre_is_admin(auth.uid()));

-- Avis : écrits uniquement par apprendre_review_take ; lus par l'admin,
-- les validateurs et l'auteur de la prise.
CREATE POLICY "Reviewers and admins read reviews" ON public.apprendre_audio_reviews
FOR SELECT TO authenticated
USING (public.apprendre_can_review(auth.uid())
       OR EXISTS (SELECT 1 FROM public.apprendre_audio_takes t
                  WHERE t.id = take_id AND t.speaker_id = auth.uid()));

-- Lots
CREATE POLICY "Contributors read own assignments" ON public.apprendre_audio_assignments
FOR SELECT TO authenticated
USING (speaker_id = auth.uid() OR reviewer_id = auth.uid() OR public.apprendre_is_admin(auth.uid()));
CREATE POLICY "Admins manage assignments" ON public.apprendre_audio_assignments
FOR ALL TO authenticated
USING (public.apprendre_is_admin(auth.uid())) WITH CHECK (public.apprendre_is_admin(auth.uid()));

-- Signalements
CREATE POLICY "Contributors report text issues" ON public.apprendre_text_issues
FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid()
            AND (public.apprendre_can_speak(auth.uid()) OR public.apprendre_can_review(auth.uid())));
CREATE POLICY "Contributors read text issues" ON public.apprendre_text_issues
FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR public.apprendre_can_review(auth.uid()));
CREATE POLICY "Admins manage text issues" ON public.apprendre_text_issues
FOR UPDATE TO authenticated
USING (public.apprendre_is_admin(auth.uid())) WITH CHECK (public.apprendre_is_admin(auth.uid()));

-- Journal : lecture admin ; écriture uniquement par les fonctions.
CREATE POLICY "Admins read apprendre audio audit" ON public.apprendre_audio_audit
FOR SELECT TO authenticated USING (public.apprendre_is_admin(auth.uid()));

-- Droits d'exécution des fonctions
REVOKE ALL ON FUNCTION public.apprendre_audit(text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apprendre_activate_internal(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_sign_consent(text, boolean, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_withdraw_consent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_submit_take(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_review_take(uuid, text, int, int, int, int, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_activate_take(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_import_catalog(jsonb, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apprendre_audio_stats() TO authenticated;

-- ---------------------------------------------------------------------
-- 14. Stockage : bucket privé « apprendre-audio »
--     Chemin : {locuteur}/{clé audio}/{horodatage}.wav
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('apprendre-audio', 'apprendre-audio', false, 5242880, ARRAY['audio/wav', 'audio/x-wav', 'audio/wave'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Speakers upload own apprendre audio" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'apprendre-audio'
            AND (storage.foldername(name))[1] = auth.uid()::text
            AND public.apprendre_can_speak(auth.uid()));

CREATE POLICY "Speakers read own apprendre audio" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'apprendre-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Speakers delete own apprendre audio" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'apprendre-audio' AND (storage.foldername(name))[1] = auth.uid()::text
       AND EXISTS (SELECT 1 FROM public.apprendre_audio_takes t
                   WHERE t.storage_path = storage.objects.name AND t.status = 'draft'));

CREATE POLICY "Reviewers read apprendre audio" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'apprendre-audio' AND public.apprendre_can_review(auth.uid()));

CREATE POLICY "Admins manage apprendre audio" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'apprendre-audio' AND public.apprendre_is_admin(auth.uid()))
WITH CHECK (bucket_id = 'apprendre-audio' AND public.apprendre_is_admin(auth.uid()));

-- Fichier d'une prise active : vérifié par une fonction SECURITY DEFINER, car
-- le visiteur n'a pas le droit de lire la table des prises elle-même.
CREATE OR REPLACE FUNCTION public.apprendre_is_active_audio(_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.apprendre_audio_takes t WHERE t.storage_path = _path AND t.is_active)
$$;
GRANT EXECUTE ON FUNCTION public.apprendre_is_active_audio(text) TO anon, authenticated;

CREATE POLICY "Anyone reads active apprendre audio" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'apprendre-audio' AND public.apprendre_is_active_audio(name));
