-- =====================================================================
-- FITILA Apprendre — rôles « voix de référence »
-- Migration séparée : une nouvelle valeur d'énumération ne peut pas être
-- utilisée dans la transaction qui l'ajoute.
-- =====================================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'voice_speaker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'voice_reviewer';
