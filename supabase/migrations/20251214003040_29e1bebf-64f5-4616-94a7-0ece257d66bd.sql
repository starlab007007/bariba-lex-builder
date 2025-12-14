-- D'abord, nettoyer les données orphelines (posts sans profil)
DELETE FROM tamtam_posts 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT user_id FROM tamtam_profiles WHERE user_id IS NOT NULL);

DELETE FROM tamtam_stories 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT user_id FROM tamtam_profiles WHERE user_id IS NOT NULL);

DELETE FROM tamtam_comments 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT user_id FROM tamtam_profiles WHERE user_id IS NOT NULL);

-- Ajouter clé étrangère tamtam_posts → tamtam_profiles
ALTER TABLE tamtam_posts 
ADD CONSTRAINT tamtam_posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES tamtam_profiles(user_id) ON DELETE CASCADE;

-- Ajouter clé étrangère tamtam_stories → tamtam_profiles
ALTER TABLE tamtam_stories 
ADD CONSTRAINT tamtam_stories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES tamtam_profiles(user_id) ON DELETE CASCADE;

-- Ajouter clé étrangère tamtam_comments → tamtam_profiles
ALTER TABLE tamtam_comments 
ADD CONSTRAINT tamtam_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES tamtam_profiles(user_id) ON DELETE CASCADE;