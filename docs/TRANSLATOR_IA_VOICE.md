# Voix dans le Traducteur et FITILA IA

Les visiteurs et les comptes connectés disposent du même parcours : écrire,
dicter ou importer un vocal, relire la transcription, puis envoyer. La dictée
ajoute son texte au brouillon existant. Le vocal reste disponible en préécoute
et en cas d’erreur pour un nouvel essai ; il n’est pas enregistré dans une table
ou un bucket par cette intégration.

- `/translator` : onglets Texte et Voix, transcription Omnilingual en français
  ou Baatɔnum, traduction ByT5/corpus, lecteur sur chaque source, chaque réponse
  et chaque traduction de l’historique.
- `/ia` et `/tem-ia` : la recherche locale sur les documents demeure locale.
  Chaque réponse, y compris dans l’historique, possède un lecteur Baatɔnum.
  Un bouton « Mode vocal » ouvre en plus une discussion vocale directe et
  continue (même principe que DUNYA IA — écoute, réponse, écoute mains
  libres), toujours répondue par la recherche locale embarquée du Code
  Foncier (`answerFromCorpus`), jamais par le moteur d’IA générale ni ByT5.
  Entrée vocale : reconnaissance du navigateur en français, ou transcription
  seule (`dunya-voice-turn`, `transcribe_only`) en baatɔnum. Sortie vocale :
  lecture seule (`speech_only`), comme le lecteur de chaque réponse.
- L’ancien écran `FitilaIA` utilise également ces composants s’il est réintégré.
- L’application Flutter offre la même discussion vocale continue pour son
  module Fitila IA (Tem IA), avec `bariba-stt`/`transcribe-audio` pour
  l’écoute et `bariba-tts` pour la lecture — la réponse reste celle du
  Code Foncier local (`FoncierRag.answer`).

La lecture Baatɔnum utilise Meta MMS via le backend public borné
`dunya-voice-turn`, en mode `speech_only`. Ce mode ne rappelle ni le moteur IA
ni ByT5, et lit le texte réellement sélectionné. La lecture française utilise
la voix française de l’appareil, identifiée dans le lecteur ; le service MMS
actuel ne déploie que `facebook/mms-tts-bba`. Aucune voix française n’est
présentée comme une voix MMS. Si le navigateur bloque la lecture ou ne fournit
pas de voix, le lecteur propose un nouvel essai et affiche le problème.

Les réponses longues sont découpées aux limites des phrases et mots, sans
limite cumulée de 1 600 caractères. Chaque passage est généré puis lu avant le
suivant. Pause, reprise, arrêt, vitesse et progression par passages sont
disponibles. Un cache en mémoire de 24 passages/16 Mo limite les appels répétés.
Les URL temporaires sont libérées ; une nouvelle lecture ou une dictée arrête
la lecture précédente.

Omnilingual traite les enregistrements après conversion WAV PCM mono 16 kHz.
Le micro et les imports sont limités à deux minutes ; les fichiers à 20 Mo.
La transcription est proposée à la correction et n’est jamais envoyée
automatiquement comme une question. Un échec français ne déclenche jamais le
moteur de secours réservé au Bariba. Les replis Bariba existants indiquent
leur véritable moteur dans le lecteur ou l’état de transcription.

Le backend conserve l’authentification personnalisée, les quotas durables et le
verrou CPU partagé. La lecture a son budget spécifique : 30 demandes/minute
pour un visiteur, 40 pour un compte ; la saisie garde 6/12 demandes/minute.
Les budgets globaux restent 60 demandes/minute et 1 000/jour. Les secrets VPS
restent exclusivement côté serveur. Aucune migration n’est requise.

La CI `Validate Translator and IA voice` contrôle le backend, la préservation
des textes longs, et les parcours Chromium à 375, 768 et 1 280 pixels. Les tests
simulés vérifient les contrats et l’interface ; une synthèse/transcription live
est nécessaire pour vérifier la disponibilité des modèles, et l’exactitude
linguistique doit être évaluée avec des locuteurs.
