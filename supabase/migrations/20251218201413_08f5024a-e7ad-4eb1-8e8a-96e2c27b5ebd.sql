-- Rendre audio_url nullable pour permettre les messages sans audio (emojis, photos seules)
ALTER TABLE tamtam_messages ALTER COLUMN audio_url DROP NOT NULL;

-- Ajouter une valeur par défaut vide pour audio_url
ALTER TABLE tamtam_messages ALTER COLUMN audio_url SET DEFAULT '';