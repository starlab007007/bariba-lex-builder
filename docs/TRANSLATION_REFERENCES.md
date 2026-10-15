# Traducteur : reconstruction réservée à la voix

Le 15 octobre 2026, l’écran du traducteur est rétabli à sa version du commit
`9decada33f3690d0147384a6f96ce17c5f3b4ffc`, avant les panneaux de comparaison
ajoutés dans #93. La saisie écrite, collée, photographiée ou importée et le
résultat traduit ne proposent plus de reformulation par proximité avec le
corpus. La route `reference-review` de `refine-bariba` répond explicitement
410, y compris pour un ancien client en cache : aucune recherche ni requête
Mistral/Gemini ne doit être déclenchée par ce mode retiré.

Le moteur ByT5, sa configuration Hugging Face, ses correspondances attestées,
son post-traitement antérieur et son repli corpus restent ceux du parcours
précédent. Ce retour ciblé ne remplace pas le modèle et ne retire pas la lecture
vocale des traductions par Meta MMS.

La reconstruction après reconnaissance vocale Omnilingual reste active dans
`bariba-stt`, `dunya-voice-turn` et le mode `transcription` de `refine-bariba`.
Les graphies proches, lettres manquantes et phrases proches sont comparées aux
références du dictionnaire, du corpus et d’Apprendre. Les contrôles existants
préservent les nombres, négations, pronoms et noms capitalisés repérés. Les
scores restent des similarités, sans certification de naturalité.

Le panneau de vérification apparaît uniquement après un vocal. La proposition
reste facultative et réversible ; elle remplace seulement le fragment reconnu.
Une introduction écrite, un brouillon modifié et les doublons ambigus sont
protégés. Écrire dans l’onglet Voix ne déclenche aucune reconstruction. L’envoi
du message reste une action explicite de l’utilisateur.

Les tests de régression contrôlent les deux directions écrites à 375/768/1280
pixels, le résultat exact du moteur, la lecture vocale de ce résultat, l’absence
des anciens panneaux/appels, la saisie écrite dans l’onglet Voix et les messages
mixtes conservant les faits écrits après application/annulation d’une proposition
sur le vocal. Les contrôles ASR et IA existants restent exécutés.
