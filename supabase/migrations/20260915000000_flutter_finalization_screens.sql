-- ═══════════════════════════════════════════════════════════════════
-- Migration : finalisation des écrans Flutter validés le 15/09/2026
-- (Traducteur IA historique, Paramètres/Profil, Espace Enseignant audio,
--  Module Apprendre bidirectionnel FR⇄Bariba)
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Traducteur IA — historique & favoris
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.translation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  mode TEXT DEFAULT 'texte',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.translation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own translation history"
  ON public.translation_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_translation_history_user
  ON public.translation_history (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 2. Paramètres & Profil — préférences et confidentialité
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.tamtam_profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.tamtam_profiles
  ADD COLUMN IF NOT EXISTS privacy JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.tamtam_profiles
  ADD COLUMN IF NOT EXISTS bio_audio_url TEXT;

-- ─────────────────────────────────────────────────────────────────
-- 3. Espace Enseignant — correction vocale personnalisée / générique
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.classe_student_answers
  ADD COLUMN IF NOT EXISTS teacher_audio_personal_path TEXT;
ALTER TABLE public.classe_student_answers
  ADD COLUMN IF NOT EXISTS teacher_audio_personal_duration INTEGER;
ALTER TABLE public.classe_student_answers
  ADD COLUMN IF NOT EXISTS teacher_audio_generic_path TEXT;
ALTER TABLE public.classe_student_answers
  ADD COLUMN IF NOT EXISTS teacher_audio_generic_duration INTEGER;

-- ─────────────────────────────────────────────────────────────────
-- 4. Module Apprendre — progression, maîtrise par thème, historique
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_progress (
  user_id UUID PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  current_direction TEXT NOT NULL DEFAULT 'fr_to_bariba',
  words_mastered INTEGER NOT NULL DEFAULT 0,
  perfect_scores INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own learning progress"
  ON public.learning_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.learning_theme_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  theme_key TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  mastery_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN total_count = 0 THEN 0
    ELSE ROUND((correct_count::numeric / total_count::numeric) * 100, 1) END
  ) STORED,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, theme_key)
);
ALTER TABLE public.learning_theme_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own theme mastery"
  ON public.learning_theme_mastery FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.learning_session_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL, -- 'exercise' | 'classe_lesson' | 'pronunciation'
  theme_or_lesson_ref TEXT,
  direction TEXT,
  correct_count INTEGER,
  total_count INTEGER,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.learning_session_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own session log"
  ON public.learning_session_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_learning_session_log_user
  ON public.learning_session_log (user_id, created_at DESC);

-- Étend la table d'achievements déjà en production (contribution dictionnaire)
-- avec des compteurs d'apprentissage, pour un profil unifié.
ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS lessons_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS learning_streak_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS words_mastered INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_achievements
  ADD COLUMN IF NOT EXISTS themes_completed INTEGER NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────
-- 5. Paramètres — demande de suppression de compte (RGPD)
-- Le SDK client Supabase ne peut pas supprimer un utilisateur auth
-- (nécessite la clé service_role côté admin) : on journalise donc la
-- demande pour traitement par un administrateur.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processed | cancelled
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own deletion request"
  ON public.account_deletion_requests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nouveaux badges d'apprentissage (mêmes identifiants que learningConfig.ts
-- côté web, aujourd'hui uniquement en localStorage) branchés sur la table
-- badges déjà en production.
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value, points_reward, tier)
VALUES
  ('Premier Pas (Apprentissage)', 'Complète ta première leçon bidirectionnelle', '🎯', 'lessons_completed', 1, 50, 'bronze'),
  ('Régularité', '7 jours d''affilée en pratique', '🔥', 'learning_streak_days', 7, 100, 'bronze'),
  ('Centurion', '100 mots maîtrisés', '💯', 'words_mastered', 100, 200, 'silver'),
  ('Parfait', '10 exercices parfaits', '✨', 'perfect_scores', 10, 150, 'silver'),
  ('Polyglotte', 'Tous les thèmes complétés', '🌍', 'themes_completed', 14, 1000, 'platinum')
ON CONFLICT (name) DO NOTHING;
