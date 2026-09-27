-- FITILA Apprendre v2.4
-- Compléments faible connexion + statut de calibrage de la comparaison vocale.

ALTER TABLE public.apprendre_audio_settings
  ADD COLUMN IF NOT EXISTS compare_calibrated boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'apprendre_compare_score_order'
       AND conrelid = 'public.apprendre_audio_settings'::regclass
  ) THEN
    ALTER TABLE public.apprendre_audio_settings
      ADD CONSTRAINT apprendre_compare_score_order
      CHECK (compare_very_close > compare_close);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'apprendre_compare_mfcc_order'
       AND conrelid = 'public.apprendre_audio_settings'::regclass
  ) THEN
    ALTER TABLE public.apprendre_audio_settings
      ADD CONSTRAINT apprendre_compare_mfcc_order
      CHECK (compare_mfcc_bad > compare_mfcc_good);
  END IF;
END;
$$;

-- Métadonnées pédagogiques exposées avec les voix publiées afin que le mobile
-- puisse construire des petits packs hors-ligne sans télécharger tout le corpus.
CREATE OR REPLACE VIEW public.apprendre_audio_published AS
SELECT t.audio_key,
       t.voice,
       t.variant,
       t.storage_path,
       t.duration_ms,
       t.text_hash,
       t.activated_at,
       i.kind,
       i.pack,
       i.priority,
       CASE WHEN c.show_name THEN c.display_name ELSE NULL END AS speaker_name
  FROM public.apprendre_audio_takes t
  JOIN public.apprendre_audio_items i
    ON i.audio_key = t.audio_key
   AND i.text_hash = t.text_hash
  LEFT JOIN public.apprendre_voice_consents c ON c.user_id = t.speaker_id
 WHERE t.is_active
   AND i.in_content
   AND (c.user_id IS NULL OR c.withdrawn_at IS NULL);

GRANT SELECT ON public.apprendre_audio_published TO anon, authenticated;

CREATE INDEX IF NOT EXISTS apprendre_audio_items_priority_idx
  ON public.apprendre_audio_items (priority, kind)
  WHERE in_content;

CREATE INDEX IF NOT EXISTS apprendre_audio_takes_active_key_idx
  ON public.apprendre_audio_takes (audio_key, voice, variant)
  WHERE is_active;
