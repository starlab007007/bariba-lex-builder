-- Solution: Autoriser la lecture publique des training_phrases
-- Supprimer l'ancienne policy restrictive
DROP POLICY IF EXISTS "Anyone can read training phrases" ON public.training_phrases;

-- Créer une policy de lecture vraiment publique
CREATE POLICY "Public read access to training phrases"
ON public.training_phrases
FOR SELECT
USING (true);

-- Vérifier qu'il n'y a pas d'autres policies qui pourraient bloquer
-- Cette policy permet explicitement la lecture sans aucune condition