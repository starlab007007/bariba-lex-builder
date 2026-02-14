

# Corriger le pipeline audio vocal du Dictionnaire

## Problemes identifies

1. **STT Francais** : Le mode vocal utilise uniquement Web Speech API (navigateur) au lieu de Mistral Voxtral Mini pour transcrire le francais. L'audio est enregistre mais seul le transcript Web Speech est utilise.

2. **STT Bariba** : Le pipeline Bariba STT (HuggingFace) fonctionne via `transcribeWithTranslation`, mais le resultat n'est pas toujours correctement exploite.

3. **TTS Francais** : `UnifiedAudioService.speak()` utilise Web Speech API pour le francais au lieu d'appeler le edge function `french-tts` (Inworld TTS-1.5 Mini). De plus, il verifie `data.audioContent` alors que le edge function retourne `data.audio`.

4. **TTS Bariba** : `UnifiedAudioService.speak()` verifie `data.audioContent` pour le bariba, mais le edge function `bariba-tts` retourne `data.audio` -- le champ ne correspond pas.

5. **Envoi automatique** : Les resultats vocaux doivent etre automatiquement envoyes pour recherche apres transcription.

## Plan de corrections

### 1. Corriger UnifiedAudioService.ts - TTS (parole)

**Probleme** : La methode `speak()` pour le francais utilise directement Web Speech API au lieu d'Inworld TTS-1.5 Mini.

**Correction** :
- Pour le francais : appeler le edge function `french-tts` avec `returnAudio: true`, decoder le `audioBase64` recu, et jouer l'audio. Fallback vers Web Speech API si echec.
- Pour le bariba : corriger la verification du champ de reponse de `data.audioContent` vers `data.audio` (qui est le vrai nom retourne par le edge function `bariba-tts`).

### 2. Corriger TamTamMicButton.tsx - STT Francais avec Mistral

**Probleme** : Pour le francais, le composant utilise uniquement `webSpeechSTT` (navigateur). L'audio enregistre n'est pas envoye a Mistral Voxtral Mini.

**Correction** :
- Apres l'arret de l'enregistrement en mode francais, envoyer l'audio blob au edge function `transcribe-audio` via `useFrenchSTT.transcribeAudioBlob()` (deja implemente mais pas utilise).
- Utiliser le resultat Mistral en priorite, et garder Web Speech API comme fallback seulement si Mistral echoue.
- Supprimer la dependance principale sur `webSpeechSTT` pour le francais.

### 3. Corriger TamTamMicButton.tsx - Envoi automatique

**Probleme** : L'envoi du resultat vocal n'est pas toujours automatique.

**Correction** :
- S'assurer que `onRecordingComplete` est appele systematiquement avec les donnees de transcription, que ce soit pour le francais (Mistral) ou le bariba (HuggingFace).

### 4. Corriger TamTamDictionary.tsx - TTS de la reponse

**Probleme** : `speakCurrentLang` passe par `UnifiedAudioService` qui n'utilise pas Inworld pour le francais.

**Correction** :
- Remplacer `useUnifiedAudio` par `useBilingualAudio` dans le dictionnaire pour beneficier de `useFrenchTTS` (qui appelle deja le edge function `french-tts` avec Inworld) et de `useBaribaTTS` pour le bariba.
- Ou alternativement, corriger `UnifiedAudioService.speak()` pour qu'il appelle `french-tts` avec `returnAudio: true` (solution choisie car elle corrige le probleme globalement).

### 5. Ajouter l'import de useFrenchSTT dans TamTamMicButton

Pour pouvoir appeler `transcribeAudioBlob` (Mistral Voxtral Mini) directement depuis le bouton micro.

## Details techniques

**Fichiers modifies :**

- `src/services/UnifiedAudioService.ts` : Corriger `speak()` pour utiliser Inworld TTS via `french-tts` edge function (francais) et corriger le champ `audioContent` -> `audio` (bariba)
- `src/components/tamtam/TamTamMicButton.tsx` : Integrer `transcribeAudioBlob` de `useFrenchSTT` pour le STT francais via Mistral, au lieu de compter uniquement sur Web Speech API
- `src/pages/tamtam/TamTamDictionary.tsx` : Ajustements mineurs si necessaire pour l'envoi automatique

**Flux corriges :**

Francais :
```
Utilisateur parle -> Enregistrement audio -> Audio blob envoye a Mistral Voxtral Mini (transcribe-audio) -> Transcription recue -> Recherche automatique dans le dictionnaire -> Resultat lu par Inworld TTS-1.5 Mini (french-tts)
```

Bariba :
```
Utilisateur parle -> Enregistrement audio -> Audio base64 envoye a bariba-stt (HuggingFace) -> Transcription recue -> Recherche automatique dans le dictionnaire -> Reponse en bariba lue par bariba-tts (HuggingFace)
```

