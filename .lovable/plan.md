

L'utilisateur veut :
1. **Calibration micro pro** : VAD (détection voix), suppression bruits, enregistrement clean
2. **Réécoute haute qualité** : audio bien traité avant validation
3. **Export admin en WAV** : conversion automatique webm/mp4 → WAV 16kHz mono PCM
4. **Format prêt-entraînement** : pour chaque enregistrement, un `.wav` + un `.txt` du même nom + `metadata.csv` global

Analyse du code existant :
- `useAudioRecorder.ts` utilise MediaRecorder avec mime webm/mp4 — pas de WAV natif côté navigateur
- L'export ZIP actuel (`voice-corpus-export/index.ts`) copie les fichiers tels quels (webm/mp4)
- Pas de calibration micro, pas de VAD côté capture
- Aucune génération de `.txt` jumelé

Solution proposée :

# Plan : Micro pro + Export WAV prêt-entraînement

## A. Capture audio haute qualité (côté navigateur)

**Refonte de `useAudioRecorder.ts`** avec contraintes audio professionnelles :

```ts
audio: {
  channelCount: 1,                  // Mono (standard ASR)
  sampleRate: 16000,                // 16 kHz (standard Whisper/Wav2Vec2)
  echoCancellation: true,           // Annule l'écho
  noiseSuppression: true,           // Supprime bruit de fond
  autoGainControl: true,            // Normalise volume
  // Constraintes avancées Chrome/Edge
  googHighpassFilter: true,
  googTypingNoiseDetection: true,
  googAudioMirroring: false,
}
```

**Nouveau pipeline AudioContext** :
- Capture via `MediaStreamSource` → `AnalyserNode` (pour le VU-meter visuel)
- `BiquadFilterNode` highpass à 80 Hz (élimine ronflements)
- `DynamicsCompressorNode` léger (-24 dB threshold, ratio 3:1) pour égaliser le volume
- Enregistrement parallèle via MediaRecorder (webm/opus 32 kbps mono)

**Détection silence/voix (VAD léger en RMS)** :
- Calcul du niveau RMS toutes les 100 ms via l'`AnalyserNode`
- Affichage temps réel : barre verte (voix détectée) / grise (silence)
- Indicateur visuel "🎙️ Parlez maintenant" / "⚠️ Bruit détecté" / "🤫 Silence"
- Trim automatique des silences > 500 ms en début/fin avant validation

## B. Conversion vers WAV PCM 16 kHz côté client

**Nouveau utilitaire `src/lib/audioToWav.ts`** :
1. Décode le Blob webm/mp4 capturé via `OfflineAudioContext`
2. Re-échantillonne à **16 kHz mono** (resampling linéaire interne d'`OfflineAudioContext`)
3. Applique : highpass 80 Hz + noise gate doux (-50 dB) + normalisation peak à -3 dBFS
4. Encode en **WAV PCM 16-bit** (format universel, compatible Whisper/Wav2Vec2/Praat)

**Avantage** : on stocke directement du WAV en Storage → l'export admin n'a plus rien à convertir, c'est instantané.

## C. UX réécoute haute qualité

Dans `FitilaVoiceLab.tsx`, phase `recorded` :
- Affiche **2 informations** : durée nette + pic dB (qualité)
- Lecteur `<audio controls>` joue le WAV traité (la version finale, pas la brute)
- Si la qualité est faible (RMS < seuil ou trop de silence) → bandeau jaune "⚠️ Audio faible, recommencez ?"
- Bouton [🔁 Refaire] efface et retourne à `idle`
- Bouton [✓ Valider & suivante] upload le WAV final

## D. Export admin format prêt-entraînement

**Refonte `supabase/functions/voice-corpus-export/index.ts`** :

Structure du ZIP générée :
```
corpus_bariba_2026-04-19.zip
├─ metadata.csv                ← format HuggingFace datasets
├─ README.txt
├─ wavs/
│   ├─ salutations_a_kpuna_<id8>.wav
│   ├─ salutations_a_kpuna_<id8>.txt    ← UTF-8, texte bariba seul
│   ├─ marche_dwa_<id8>.wav
│   ├─ marche_dwa_<id8>.txt
│   └─ ...
```

**Format `metadata.csv`** (compatible HF Datasets / Common Voice) :
```csv
file_name,transcription,transcription_french,category,duration,user_id,recorded_at
wavs/salutations_a_kpuna_d3f9.wav,"A kpuna n do ?","As-tu bien dormi ?",Salutations,2.8,<uid>,2026-04-15T...
```

**Logique** :
1. Pour chaque recording, télécharger le fichier depuis Storage
2. Si déjà WAV → écrire tel quel dans `wavs/`
3. Si webm/mp4 (legacy avant la refonte) → convertir via FFmpeg WASM côté Deno OU marquer comme "legacy" et exclure
4. Générer le `.txt` du même nom contenant uniquement `text_bariba`
5. Nommage : `<category_slug>_<3_premiers_mots_slug>_<8_chars_id>.wav`

**Filtres export** :
- Par catégorie (déjà existant)
- Par statut : `validated only` / `all`
- Durée min/max (ex : 1s ≤ x ≤ 15s, recommandé pour Whisper)

## E. Migrations & changements DB

Aucune migration de schéma nécessaire. Optionnel :
- Ajouter colonnes `peak_db numeric`, `rms_db numeric`, `processed boolean default false` dans `bariba_voice_recordings` pour traçabilité qualité
- Stocker `mime_type='audio/wav'` désormais

## Fichiers modifiés/créés

**Créés** :
- `src/lib/audioToWav.ts` — décodage + resampling 16k + encode WAV PCM 16-bit
- `src/lib/audioVad.ts` — analyse RMS temps réel + trim silences

**Modifiés** :
- `src/hooks/useAudioRecorder.ts` — contraintes pro + AudioContext pipeline + VAD hooks
- `src/pages/fitila/FitilaVoiceLab.tsx` — VU-meter, indicateur qualité, lecture du WAV traité
- `src/hooks/useVoiceCorpus.ts` — upload du WAV traité, mime `audio/wav`, extension `.wav`
- `supabase/functions/voice-corpus-export/index.ts` — génère paires `.wav` + `.txt`, nommage propre, CSV format HF
- Migration optionnelle : ajout colonnes qualité

## Garanties

- **Audio propre** : echoCancel + noiseSuppress natifs + highpass 80Hz + compression douce
- **Format universel** : WAV PCM 16 kHz mono 16-bit = standard absolu pour ASR (Whisper, Wav2Vec2, Praat, Audacity)
- **Pas de double conversion** : conversion en WAV au moment de la capture, le serveur ne fait que zipper
- **Prêt-entraînement** : structure `wavs/<id>.wav` + `wavs/<id>.txt` + `metadata.csv` directement utilisable par `datasets.load_dataset("audiofolder", data_dir=...)` de HuggingFace
- **Qualité visible** : utilisateur voit le niveau de sa voix en direct et peut refaire si besoin
- **Aucune dépendance externe** : tout fait avec Web Audio API native (gratuit, sans API)

