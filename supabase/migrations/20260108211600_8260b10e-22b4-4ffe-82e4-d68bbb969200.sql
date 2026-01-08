-- Créer les profils manquants pour les utilisateurs existants
INSERT INTO public.tamtam_profiles (user_id, username, display_name, phone_number, created_at)
SELECT 
  u.id,
  'user_' || SUBSTRING(REPLACE(u.id::text, '-', ''), 1, 8),
  COALESCE(u.raw_user_meta_data ->> 'display_name', 'Utilisateur'),
  COALESCE(u.phone, u.raw_user_meta_data ->> 'phone_number'),
  NOW()
FROM auth.users u
LEFT JOIN public.tamtam_profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Index pour accélérer les requêtes de réactions
CREATE INDEX IF NOT EXISTS idx_tamtam_reactions_post_id 
ON tamtam_reactions(post_id);