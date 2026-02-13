

# Plan : Integrer Inworld TTS + Mistral STT dans tout le Griot et Village Chronicle

## Diagnostic

L'analyse du code revele 4 points d'integration narration/TTS/STT repartis dans le projet :

1. **`useAnimeStoryGenerator.ts`** (Griot Studio) - TTS pour narration des scenes animees
   - BUG : verifie `ttsData?.audioContent` alors que la fonction retourne `audioBase64` -- l'audio n'est jamais recupere
2. **`GriotStudio.tsx`** - STT via `transcribe-audio` (deja Mistral -- OK)
3. **`VillageChronicle.ts`** - TTS pour narration du journal TV
   - Commentaires mentionnent encore "ElevenLabs" mais appelle deja `french-tts` (OK fonctionnellement)
4. **`SegmentEditor.tsx` / `StoryBuilder.tsx`** (Conte Vivant) - deja migre avec selecteur de voix

## Problemes identifies

| Fichier | Probleme |
|---------|----------|
| `useAnimeStoryGenerator.ts` (ligne 336) | Verifie `audioContent` au lieu de `audioBase64` -- audio toujours null |
| `useAnimeStoryGenerator.ts` (ligne 334) | Ne passe pas de `voice` -- utilise la voix par defaut |
| `VillageChronicle.ts` (ligne 1803) | Commentaire mentionne "ElevenLabs" alors que c'est Inworld |
| `VillageChronicle.ts` (ligne 1827) | Commentaire mentionne "ElevenLabs audio received" |

## Modifications prevues

### 1. `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts`

**Corriger le bug critique** : remplacer `ttsData?.audioContent` par `ttsData?.audioBase64` (le champ retourne par la fonction `french-tts`).

Ajouter le parametre `voice: 'narrator'` dans l'appel TTS pour forcer la voix Timothy (narrateur francais natif).

```text
Avant:  if (!ttsError && ttsData?.audioContent) { audioBase64 = ttsData.audioContent; }
Apres:  if (!ttsError && ttsData?.success && ttsData?.audioBase64) { audioBase64 = ttsData.audioBase64; }
```

### 2. `src/templates/VillageChronicle.ts`

Mettre a jour les commentaires pour refleter l'architecture actuelle (Inworld TTS-1.5 Mini, pas ElevenLabs). Aucun changement fonctionnel necessaire car `generateNarration()` appelle deja `french-tts` avec `returnAudio: true` et lit `data.audioBase64`.

### 3. Aucune modification cote Edge Functions

Les fonctions `french-tts` et `transcribe-audio` sont deja correctement configurees :
- `french-tts` : Inworld TTS-1.5 Mini avec `language: 'fr'`
- `transcribe-audio` : Mistral Voxtral Mini avec `language: 'fr'`

### 4. Verification de la politique "francais uniquement"

Tous les appels STT passent par `transcribe-audio` qui force deja `language: 'fr'`. Tous les appels TTS passent par `french-tts` qui force `language: 'fr'`. La politique est respectee.

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/griot-studio/hooks/useAnimeStoryGenerator.ts` | Corriger `audioContent` en `audioBase64`, ajouter `voice: 'narrator'` |
| `src/templates/VillageChronicle.ts` | Mettre a jour commentaires (ElevenLabs vers Inworld TTS) |

## Impact

- Le Griot Studio va enfin produire de l'audio dans les contes animes (bug corrige)
- Tous les templates utilisent Inworld TTS-1.5 Mini en francais natif
- Tous les STT utilisent Mistral Voxtral Mini en francais

