# Cerveau FITILA auto-hébergé

Gemma 4 E2B, même fichier et empreinte que le téléchargement Flutter.
Exécution CPU avec LiteRT-LM 0.18.1, deux threads, une inférence simultanée,
sortie limitée à 160 tokens. Aucun fournisseur payant, aucune mémoire
partagée entre visiteurs. Le modèle est monté en lecture seule et son
SHA-256 est vérifié avant démarrage.

Le conteneur ne publie aucun port et Traefik ne l’expose pas.
Seule la route authentifiée /voice-api/chat de la passerelle vocale
y accède. Le jeton reste dans les services serveur.

Le déploiement doit vérifier une vraie réponse Gemma, puis la conversation
via Supabase. La disponibilité ASR/TTS seule ne valide pas ce service.
