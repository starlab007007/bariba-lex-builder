-- Ajouter des politiques RLS pour permettre l'insertion de traductions dans le cache
-- par le système (pas seulement les admins)

-- Permettre aux utilisateurs authentifiés de lire le cache de traduction
CREATE POLICY "Authenticated users can read translation cache"
ON translation_memory
FOR SELECT
TO authenticated
USING (true);

-- Permettre au système d'insérer des traductions dans le cache
CREATE POLICY "System can insert into translation cache"
ON translation_memory
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permettre au système de mettre à jour le cache (usage_count, updated_at)
CREATE POLICY "System can update translation cache"
ON translation_memory
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);