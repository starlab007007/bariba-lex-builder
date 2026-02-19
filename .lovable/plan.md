
# Diagnostic Complet : Bariba STT (voix → texte bariba)

## Architecture actuelle (flux de données)

Le pipeline Bariba STT implique 4 couches distinctes :

```text
[Micro utilisateur]
       ↓  (pression bouton)
[TamTamMicButton] — enregistre en audio/webm (MediaRecorder)
       ↓  (audioBase64)
[TamTamDictionary / TamTamTranslator]
       ↓  appel handleVoiceCommand / handleVoiceResult
[useBaribaSTT.transcribe()]
       ↓  supabase.functions.invoke('bariba-stt')
[Edge Function bariba-stt]
       ↓  3 étapes Gradio v4
[HuggingFace Space zimesongbian/baatonum_asr_stt_api_v001_improve]
```

---

## Problèmes identifiés

### Problème 1 — Double chemin STT : conflit entre `useUnifiedAudio` et `useBaribaSTT`

Dans `TamTamMicButton.tsx` (ligne 304), quand `sourceLang === 'ba'` et `autoTranscribe = true`, le bouton appelle :
```typescript
const result = await unifiedAudio.transcribeWithTranslation(audioBase64, sourceLang);
```
Ce chemin passe par `UnifiedAudioService.transcribeAndTranslate()` → `bariba-stt`.

Mais dans `TamTamDictionary.tsx`, le `TamTamMicButton` est appelé avec `autoTranscribe={true}`, puis `handleVoiceCommand` vérifie si `result.transcription` est vide, et seulement ALORS appelle `useBaribaSTT`. **Problème : si `UnifiedAudioService` réussit (ou échoue silencieusement), le second appel `useBaribaSTT` ne se fait jamais car `result.transcription` est déjà défini (même vide → `''` est falsy, donc ça marchera).**

En réalité le flux dans le dictionnaire est le suivant :
1. `TamTamMicButton` → `autoTranscribe=true` → `unifiedAudio.transcribeWithTranslation()` → appel `bariba-stt` → résultat dans `result.transcription`
2. `handleVoiceCommand` reçoit ce résultat, vérifie si vide
3. Si vide → appelle `transcribeBariba` (useBaribaSTT) — double appel STT !

Le résultat du **premier** appel (via UnifiedAudioService) si il échoue retourne `transcription: ''`, puis le deuxième appel (via useBaribaSTT) se déclenche. Mais c'est le même endpoint `bariba-stt` — **deux appels consécutifs au même service défaillant**.

### Problème 2 — `TamTamMicButton` utilise `autoTranscribe=true` dans le Dictionnaire mais le Traducteur ne le fait PAS

Dans `TamTamDictionary.tsx` :
```tsx
<TamTamMicButton autoTranscribe={true} autoTranslate={false} sourceLang="ba" />
```
→ `TamTamMicButton` appelle `unifiedAudio.transcribeWithTranslation()` lui-même, PUIS `handleVoiceCommand` ré-appelle potentiellement `useBaribaSTT` → **deux appels STT**.

Dans `TamTamTranslator.tsx`, `handleVoiceResult` ne reçoit PAS de transcription pré-faite depuis le `TamTamMicButton` (non visible dans le code du Traducteur), et appelle directement `transcribeBariba` si `sourceLang === 'ba'`.

### Problème 3 — L'edge function `bariba-stt` : `SSE stream ended without complete event`

Les logs montrent que l'erreur récurrente est :
```
"details": "SSE stream ended without complete event"
```
Après analyse du code SSE dans `bariba-stt/index.ts`, le problème vient du fait que :
- Le Space HuggingFace retourne **3 événements SSE intermédiaires** avant le final : `estimation`, `process_starts`, puis le résultat final
- Le parser actuel cherche `event: complete` ou `msg: process_completed` en analysant les blocs délimités par une ligne vide (`''`)
- **Si le Space retourne le SSE avec des `\r\n` (CRLF) au lieu de `\n` (LF)**, le split sur `\n` laisse des `\r` résiduels qui font échouer `line === ''` (car `line` vaut `'\r'` et non `''`)

De plus, d'après les logs du TTS (qui utilise `queue/join` et réussit), le format du Space est :
```
data: {"msg":"estimation",...}

data: {"msg":"process_starts",...}

data: {"msg":"process_completed","event_id":"...","output":{"data":["texte transcrit"],...}}
```
Le champ `output.data[0]` est directement **un string** — format A standard de Gradio. Mais le parser cherche aussi `event: complete` (format B custom) qui n'existe peut-être pas sur ce Space.

### Problème 4 — Délimiteur CRLF vs LF dans le parseur SSE

Le code actuel fait :
```typescript
const lines = sseText.split('\n');
// ...
} else if (line === '' && lastData) {
```
Si le serveur renvoie `\r\n`, chaque ligne sera `"data: ...\r"` au lieu de `"data: ..."`, et les lignes vides seront `"\r"` au lieu de `""`. La condition `line === ''` ne sera **jamais** satisfaite → le parser ne trouve jamais la fin d'un bloc SSE → erreur `SSE stream ended without complete event`.

### Problème 5 — `TamTamMicButton` en mode Bariba avec `autoTranscribe=true` : redondance et erreur silencieuse

Quand `autoTranscribe=true` dans le Dictionnaire, `TamTamMicButton` appelle `unifiedAudio.transcribeWithTranslation()` qui lève une erreur si STT échoue — mais l'erreur est catchée en interne et retourne `transcription: ''`. Le callback `onRecordingComplete` reçoit alors `{ audioBase64, transcription: undefined }`. Puis `handleVoiceCommand` voit `!query && result.audioBase64` et refait un appel STT.

---

## Solution : 3 corrections ciblées

### Correction 1 — Edge function `bariba-stt/index.ts` : robustification du parseur SSE

**Normaliser CRLF → LF avant de splitter**, et améliorer l'extraction du résultat pour le format Gradio standard :

```typescript
// Normalisation CRLF → LF
const sseText = (await response.text()).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const lines = sseText.split('\n');

// Dans la boucle, détecter aussi data: contenant msg:process_completed directement
// sans attendre un événement SSE "event: xxx" précédent
```

Et ajouter la détection directe du format standard Gradio (le plus courant) où `data:` contient directement `{"msg":"process_completed",...}` sans ligne `event:` préalable.

**Ajouter aussi un timeout SSE progressif** : retry de lecture SSE jusqu'à 3 fois si le stream se termine sans résultat.

### Correction 2 — `TamTamDictionary.tsx` : supprimer la double transcription

Changer `autoTranscribe={false}` dans le `TamTamMicButton` du Dictionnaire, pour que le callback reçoive uniquement `audioBase64` brut. La transcription est ensuite gérée uniquement par `handleVoiceCommand` via `useBaribaSTT` — un seul chemin, clair et traceable.

```tsx
<TamTamMicButton
  autoTranscribe={false}   // ← était true, causait double-STT
  autoTranslate={false}
  sourceLang={searchDirection === 'ba-fr' ? 'ba' : 'fr'}
  onRecordingComplete={handleVoiceCommand}
/>
```

Pour le français, gérer la transcription française directement dans `handleVoiceCommand` via `useFrenchSTT`.

### Correction 3 — `TamTamTranslator.tsx` : même simplification pour le mode vocal Bariba

S'assurer que le `TamTamMicButton` utilisé dans le Traducteur passe `autoTranscribe={false}` côté Bariba, et que `handleVoiceResult` gère tout le pipeline STT via `useBaribaSTT`.

---

## Fichiers à modifier

| Fichier | Changement |
|---|---|
| `supabase/functions/bariba-stt/index.ts` | Fix CRLF + robustification parseur SSE + logs détaillés du SSE brut |
| `src/pages/tamtam/TamTamDictionary.tsx` | `autoTranscribe={false}` dans TamTamMicButton + gestion transcription FR dans handleVoiceCommand |
| `src/pages/tamtam/TamTamTranslator.tsx` | Vérifier que handleVoiceResult est le seul chemin STT Bariba |

---

## Résultat attendu

```text
Utilisateur parle en Bariba (Dictionnaire/Traducteur)
→ TamTamMicButton collecte l'audio raw (audioBase64)
→ handleVoiceCommand/handleVoiceResult appelle useBaribaSTT.transcribe()
→ bariba-stt edge function :
    1. Upload audio sur HuggingFace (multipart)
    2. POST /gradio_api/call/transcribe → event_id
    3. GET /gradio_api/call/transcribe/{event_id} → SSE (CRLF normalisé)
    4. Extraction correcte de output.data[0] ou transcription
→ Texte Bariba retourné → affiché / recherché dans le dictionnaire
```
