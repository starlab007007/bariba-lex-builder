-- Supprimer l'ancienne clé étrangère qui cause le conflit avec PostgREST
ALTER TABLE tamtam_posts DROP CONSTRAINT IF EXISTS yovo_posts_user_id_fkey;