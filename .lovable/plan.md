

# Plan : Remplacer ElevenLabs STT par Mistral Voxtral Mini Transcribe V2

## Contexte

Actuellement, la fonction Edge `transcribe-audio` utilise **ElevenLabs STT (scribe_v2)** comme moteur principal de transcription, avec un fallback vers Gemini Flash. Pour reduire les couts, on remplace ElevenLabs par **Mistral Voxtral Mini Transcribe V2** ($0.003/min vs ElevenLabs payant).

## API Mistral Voxtral - Format

L'endpoint Mistral pour la transcription :

```text
POST https://api.mistral.ai/v1/audio/transcriptions
Headers: Authorization: Bearer MISTRAL_API_KEY
Body (multipart/form-data):
  - model: "voxtral-mini-latest"
  - file: <fichier audio>
  - language: "fr"
  - timestamp_granularities: "word"   (pour obtenir les timestamps mot par mot)
  - diarize: false
```

La reponse inclut le texte transcrit et des timestamps par mot, ce qui est equivalent a ce que fournissait ElevenLabs.

## Fichiers a modifier

### 1. `supabase/functions/transcribe-audio/index.ts`
- **Supprimer** completement la fonction `transcribeWithElevenLabs()`
- **Ajouter** une nouvelle fonction `transcribeWithMistral()` qui appelle `https://api.mistral.ai/v1/audio/transcriptions`
- **Remplacer** la reference a `ELEVENLABS_API_KEY` par `MISTRAL_API_KEY` dans le flux principal
- **Conserver** le fallback Gemini tel quel
- **Mettre a jour** les commentaires et logs

### 2. Secret a configurer
- **Ajouter** le secret `MISTRAL_API_KEY` via l'outil de gestion des secrets
- `ELEVENLABS_API_KEY` reste disponible pour le TTS (`french-tts`) -- on ne le supprime pas

### 3. Commentaires dans les fichiers clients (pas de changement de code)
- `src/components/griot-studio/GriotStudio.tsx` : le commentaire "ElevenLabs STT" sera obsolete, mise a jour du commentaire
- `src/lib/AIServicesHub.ts` : aucun changement (appelle simplement `transcribe-audio`)
- `src/services/UnifiedAudioService.ts` : aucun changement (utilise aussi `transcribe-audio`)

## Details techniques

### Nouvelle fonction `transcribeWithMistral()`

```text
async function transcribeWithMistral(audioFile, apiKey):
  1. Creer un FormData avec:
     - model = "voxtral-mini-latest"
     - file = audioFile
     - language = "fr"
     - timestamp_granularities = "word"
  2. POST vers https://api.mistral.ai/v1/audio/transcriptions
     Header: Authorization: Bearer apiKey
  3. Parser la reponse JSON
  4. Retourner { text, words[], language }
```

### Flux principal mis a jour

```text
1. Lire MISTRAL_API_KEY (au lieu de ELEVENLABS_API_KEY)
2. Si MISTRAL_API_KEY existe -> transcribeWithMistral()
3. Si echec ou vide -> fallback Gemini (inchange)
4. Si tout echoue -> erreur avec suggestion Web Speech API
```

### Format de reponse Mistral attendu

La reponse Mistral `/v1/audio/transcriptions` avec `timestamp_granularities=word` retourne un JSON contenant le texte complet et les mots avec timestamps, compatible avec le format actuel `{ text, words[], language }`.

## Resume des changements

| Fichier | Action |
|---------|--------|
| `supabase/functions/transcribe-audio/index.ts` | Remplacer ElevenLabs par Mistral Voxtral |
| `src/components/griot-studio/GriotStudio.tsx` | Mise a jour commentaire uniquement |
| Secret `MISTRAL_API_KEY` | A configurer par l'utilisateur |

