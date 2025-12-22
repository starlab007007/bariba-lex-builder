-- =====================================================
-- FIL D'ACTUALITÉ RADIO-VISUELLE - MIGRATION
-- =====================================================

-- 1. Ajouter les nouveaux champs à tamtam_posts
ALTER TABLE public.tamtam_posts 
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS template_id TEXT,
ADD COLUMN IF NOT EXISTS action_buttons JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS audio_narration_url TEXT,
ADD COLUMN IF NOT EXISTS audio_narration_ba_url TEXT,
ADD COLUMN IF NOT EXISTS response_to_post_id UUID REFERENCES public.tamtam_posts(id),
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS comprehension_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS utility_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS culture_score INTEGER DEFAULT 0;

-- 2. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_tamtam_posts_topic ON public.tamtam_posts (topic);
CREATE INDEX IF NOT EXISTS idx_tamtam_posts_template ON public.tamtam_posts (template_id);
CREATE INDEX IF NOT EXISTS idx_tamtam_posts_location ON public.tamtam_posts (location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_tamtam_posts_response ON public.tamtam_posts (response_to_post_id);

-- 3. Table pour le suivi de l'apprentissage
CREATE TABLE IF NOT EXISTS public.tamtam_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.tamtam_posts(id) ON DELETE CASCADE,
  understood BOOLEAN DEFAULT false,
  repeated BOOLEAN DEFAULT false,
  quiz_score INTEGER,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- 4. Table pour les alertes locales (météo, santé, marché)
CREATE TABLE IF NOT EXISTS public.tamtam_local_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('weather', 'health', 'market', 'event', 'emergency')),
  title TEXT NOT NULL,
  audio_url TEXT,
  audio_url_ba TEXT,
  content TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_name TEXT,
  radius_km INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- 5. Table pour les templates de création guidée
CREATE TABLE IF NOT EXISTS public.tamtam_creation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  label_ba TEXT,
  category TEXT NOT NULL CHECK (category IN ('village', 'agriculture', 'health', 'culture', 'market', 'education', 'general')),
  steps JSONB NOT NULL,
  music_url TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. RLS Policies
ALTER TABLE public.tamtam_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamtam_local_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamtam_creation_templates ENABLE ROW LEVEL SECURITY;

-- Learning progress policies
CREATE POLICY "Users can view own learning progress" ON public.tamtam_learning_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning progress" ON public.tamtam_learning_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning progress" ON public.tamtam_learning_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Local alerts policies (public read, admin write)
CREATE POLICY "Anyone can view active local alerts" ON public.tamtam_local_alerts
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create local alerts" ON public.tamtam_local_alerts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Templates policies (public read)
CREATE POLICY "Anyone can view active templates" ON public.tamtam_creation_templates
  FOR SELECT USING (is_active = true);

-- 7. Insérer les templates de base
INSERT INTO public.tamtam_creation_templates (template_key, icon, label_fr, label_ba, category, steps) VALUES
('village_info', '🏘️', 'Info du village', 'Àròyé ìlú', 'village', '[
  {"step": 1, "instruction_fr": "Filmez votre lieu pendant 5 secondes", "instruction_ba": "Fọ́tò ibi rẹ fún 5 seconds", "duration": 5, "type": "video"},
  {"step": 2, "instruction_fr": "Dites ce qui se passe", "instruction_ba": "Sọ ohun tó ń ṣẹlẹ̀", "duration": 15, "type": "audio"},
  {"step": 3, "instruction_fr": "Ajoutez les détails importants", "instruction_ba": "Fi àwọn ohun pàtàkì kún", "duration": 10, "type": "audio"}
]'),
('agri_conseil', '🌱', 'Conseil agricole', 'Ìmọ̀ràn àgbẹ̀', 'agriculture', '[
  {"step": 1, "instruction_fr": "Montrez le problème ou la technique", "instruction_ba": "Fi ìṣòro tàbí ọ̀nà hàn", "duration": 5, "type": "video"},
  {"step": 2, "instruction_fr": "Expliquez l''étape 1", "instruction_ba": "Ṣàlàyé ìgbésẹ̀ 1", "duration": 10, "type": "audio"},
  {"step": 3, "instruction_fr": "Expliquez l''étape 2", "instruction_ba": "Ṣàlàyé ìgbésẹ̀ 2", "duration": 10, "type": "audio"},
  {"step": 4, "instruction_fr": "Montrez le résultat", "instruction_ba": "Fi àbájáde hàn", "duration": 5, "type": "video"}
]'),
('health_tip', '🏥', 'Conseil santé', 'Ìmọ̀ràn ìlera', 'health', '[
  {"step": 1, "instruction_fr": "Nommez le sujet de santé", "instruction_ba": "Dárúkọ ọ̀rọ̀ ìlera", "duration": 5, "type": "audio"},
  {"step": 2, "instruction_fr": "Expliquez le conseil", "instruction_ba": "Ṣàlàyé ìmọ̀ràn", "duration": 20, "type": "audio"},
  {"step": 3, "instruction_fr": "Dites quand consulter un médecin", "instruction_ba": "Sọ ìgbà tó yẹ kí o rí dọ́kítà", "duration": 10, "type": "audio"}
]'),
('conte_proverbe', '📖', 'Conte / Proverbe', 'Àlọ́ / Òwe', 'culture', '[
  {"step": 1, "instruction_fr": "Dites: Il était une fois...", "instruction_ba": "Sọ pé: Ó ti wà láéláé...", "duration": 5, "type": "audio"},
  {"step": 2, "instruction_fr": "Racontez l''histoire", "instruction_ba": "Pa ìtàn náà", "duration": 45, "type": "audio"},
  {"step": 3, "instruction_fr": "Donnez la morale", "instruction_ba": "Fi ìwà ìmọ̀ràn hàn", "duration": 15, "type": "audio"}
]'),
('market_price', '🛒', 'Prix au marché', 'Owó ní ọjà', 'market', '[
  {"step": 1, "instruction_fr": "Dites le nom du produit", "instruction_ba": "Sọ orúkọ ọjà", "duration": 5, "type": "audio"},
  {"step": 2, "instruction_fr": "Annoncez le prix", "instruction_ba": "Kéde owó", "duration": 5, "type": "audio"},
  {"step": 3, "instruction_fr": "Montrez le produit", "instruction_ba": "Fi ọjà náà hàn", "duration": 5, "type": "video"}
]'),
('cours_express', '📚', 'Cours express', 'Ẹ̀kọ́ kíá', 'education', '[
  {"step": 1, "instruction_fr": "Présentez le sujet en une phrase", "instruction_ba": "Fi ọ̀rọ̀ hàn ní gbolohun kan", "duration": 8, "type": "audio"},
  {"step": 2, "instruction_fr": "Expliquez l''étape 1", "instruction_ba": "Ṣàlàyé ìgbésẹ̀ 1", "duration": 20, "type": "audio"},
  {"step": 3, "instruction_fr": "Expliquez l''étape 2", "instruction_ba": "Ṣàlàyé ìgbésẹ̀ 2", "duration": 20, "type": "audio"},
  {"step": 4, "instruction_fr": "Expliquez l''étape 3", "instruction_ba": "Ṣàlàyé ìgbésẹ̀ 3", "duration": 20, "type": "audio"},
  {"step": 5, "instruction_fr": "Résumez et concluez", "instruction_ba": "Ṣe àkópọ̀", "duration": 15, "type": "audio"}
]'),
('temoignage', '🎤', 'Témoignage', 'Ẹ̀rí', 'general', '[
  {"step": 1, "instruction_fr": "Présentez-vous brièvement", "instruction_ba": "Fi ara rẹ hàn ní ṣókí", "duration": 8, "type": "audio"},
  {"step": 2, "instruction_fr": "Racontez votre expérience", "instruction_ba": "Pa ìrírí rẹ", "duration": 30, "type": "audio"},
  {"step": 3, "instruction_fr": "Partagez ce que vous avez appris", "instruction_ba": "Pin ohun tí o kọ́", "duration": 15, "type": "audio"}
]')
ON CONFLICT (template_key) DO NOTHING;