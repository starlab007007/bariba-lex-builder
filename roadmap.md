# Roadmap
- [~] Migration conservatrice Cloud -> serveur externe canonique
  - [x] Outil d'audit/copie vérifiée SHA-256 sans écrasement (storage-migrate-to-external)
  - [x] Audit voix, réponses Classe, tamtam-audio, template-assets, export DB
  - [x] Export DB copié et vérifié
  - [x] Fiches vides externes réparées (232 fichiers vérifiés SHA-256)
  - [-] EXCLU par le propriétaire : videos, tamtam-media, tamtam-audio, anime-library, envato-assets, tous les audios Classe — ne rien migrer
  - [x] bariba-voice-corpus re-audité : 17/17 identiques SHA-256, 1 fichier source vide ignoré
  - [ ] 2 lignes vocales divergentes (validated) : audio vérifié des deux côtés, attente décision humaine
- [~] Voix Meta (MMS-TTS bba + Omnilingual ASR 300M) derrière flags
  - [x] Passerelle meta-voice-gateway, client, Apprendre (humain > Meta > indispo), exercice parler, DUNYA, docs, tests
  - [ ] Déploiement VPS (pas d'accès SSH)
  - [ ] Déploiement passerelle sur dvswhjawiooprghzeyol + secrets (SUPABASE_ACCESS_TOKEN GitHub invalide)

## DUNYA voix Meta — pilote (oct. 2026)
- [x] Pilote Meta MMS-TTS + Omnilingual ASR dans DUNYA pour comptes admin/editor connectés (actif par défaut, choix « Voix FITILA classique » possible), repli bariba-stt/bariba-tts
- [x] Option « Vérifier la transcription baatɔnum avant envoi » (texte modifiable)
- [ ] Test navigateur connecté avec preuve réseau meta-voice-gateway 200 — bloqué : aucune session de compte du backend canonique disponible dans l'agent
- [ ] Mise en production VPS — bloquée : déclenchement par le workflow deploy.yml (push main) non vérifiable d'ici
