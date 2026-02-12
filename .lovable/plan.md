

# Plan : Remplacer ElevenLabs par Inworld TTS-1.5 Mini

## Diagnostic

Les logs de la fonction `french-tts` montrent que **ElevenLabs a bloque le compte** :
```
ElevenLabs error: "Unusual activity detected. Free Tier usage disabled."
```
Sur 4 appels TTS, seul le premier a produit de l'audio. Les 3 autres ont retourne `success: false` sans donnees audio. Le player n'a donc rien a lire.

## Solution : Inworld TTS-1.5 Mini via AI/ML API

Remplacer ElevenLabs par Inworld TTS-1.5 Mini, un modele TTS rapide et abordable accessible via l'API AI/ML.

**API Inworld TTS-1.5 Mini :**
- Endpoint : `POST https://api.aimlapi.com/v1/tts`
- Auth : `Bearer <AIML_API_KEY>`
- Body : `{ model: "inworld/tts-1-5-mini", text: "...", voice: "Sarah", format: "mp3" }`
- Reponse : `{ audio: { url: "https://cdn.aimlapi.com/..." } }` (URL vers le fichier audio)

## Etapes

### 1. Ajouter le secret `AIML_API_KEY`

Demander a l'utilisateur de fournir sa cle API AI/ML (depuis aimlapi.com).

### 2. Modifier `supabase/functions/french-tts/index.ts`

**Remplacer le bloc ElevenLabs par Inworld TTS-1.5 Mini :**

- Retirer les imports et constantes ElevenLabs (VOICE_MAP, etc.)
- Quand `returnAudio: true` :
  1. Appeler `POST https://api.aimlapi.com/v1/tts` avec `{ model: "inworld/tts-1-5-mini", text: optimizedText, voice: "Sarah", format: "mp3" }`
  2. La reponse contient `{ audio: { url: "..." } }` -- une URL vers le fichier MP3
  3. Telecharger le fichier audio depuis cette URL via `fetch(audioUrl)`
  4. Convertir le buffer en base64 avec `base64Encode()`
  5. Retourner la reponse dans le meme format qu'avant : `{ success: true, method: "inworld-tts", audioBase64, audioFormat: "audio/mpeg", ... }`
- Le fallback reste identique : si l'appel echoue, retourner le texte optimise pour Web Speech API

**Mapping des voix :**

| Voix demandee | Voix Inworld |
|---------------|--------------|
| announcer | Mark |
| narrator | Timothy |
| female | Sarah |
| alloy | Alex |

### 3. Aucun changement cote client

Le format de reponse reste identique (`audioBase64` en base64), donc `SegmentEditor.tsx`, `StoryBuilder.tsx` et `BranchingPlayer.tsx` n'ont pas besoin de modification.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/french-tts/index.ts` | Remplacer ElevenLabs par Inworld TTS-1.5 Mini |

## Secret a ajouter

| Secret | Description |
|--------|-------------|
| `AIML_API_KEY` | Cle API AI/ML pour acceder a Inworld TTS-1.5 Mini |

