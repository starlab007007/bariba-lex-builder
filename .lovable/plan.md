
# Diagnostic & Correction du Service Bariba STT (HuggingFace Space)

## Problèmes Identifiés (Diagnostic)

### Problème 1 : Authentification rejetée systématiquement
Les logs de l'edge function montrent :
```
⚠️ Unauthenticated STT request rejected (x3)
```
Le composant `VoiceDictation.tsx` envoie un health check avec `audio: 'test'` **sans token JWT** (l'utilisateur n'est pas forcément connecté lors du chargement). Cela bloque même la vérification initiale.

### Problème 2 : Format audio incompatible avec l'API Gradio
L'edge function envoie l'audio en base64 inline (`data:audio/webm;base64,...`) directement dans le champ `data[]`. Mais selon l'API du Space HuggingFace, le paramètre `audio` est de type **filepath** (FileData). L'API Gradio v4 requiert :
1. **Upload du fichier** via `POST /upload` → obtenir un `path` temporaire
2. **Appel predict** avec ce `path` dans les données

### Problème 3 : La méthode de polling SSE est instable
L'implémentation actuelle utilise queue/join + polling toutes les 800ms sur 30 tentatives. Le Space `baatonum_asr_stt_api_v001_improve` expose une API REST directe `/call/predict` avec event streaming qui est plus fiable.

### Problème 4 : Pas de transcription automatique dans le Dictionnaire
Le dictionnaire vocal utilise `useUnifiedAudio` → `transcribeWithTranslation` → `bariba-stt`, mais l'audio capté par `TamTamMicButton` en mode bariba passe par ce chemin qui échoue à cause des problèmes ci-dessus. Résultat : le champ de recherche ne se remplit jamais.

### Problème 5 : Même blocage pour le Traducteur vocal
Dans `TamTamTranslator.tsx`, la voix bariba utilise `translator.translateFromAudio(audioBase64)` → `baribaSTT.transcribe()` → `bariba-stt` edge function. Même chemin défaillant.

---

## Solution : Refonte complète de l'edge function `bariba-stt`

### Nouvelle stratégie d'appel Gradio v4

L'API du Space expose deux endpoints REST stables :
- `POST /gradio_api/call/transcribe` → déclenche le traitement, retourne `{ event_id }`
- `GET /gradio_api/call/transcribe/{event_id}` → stream SSE jusqu'à `process_completed`

**Étape 1 - Upload du fichier audio :**
```
POST https://zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space/gradio_api/upload
Authorization: Bearer {HF_TOKEN}
Content-Type: multipart/form-data
Body: fichier audio (webm/wav/mp4)
→ Retourne: [{"path": "tmp/abc123.webm", ...}]
```

**Étape 2 - Appel transcribe avec le path :**
```
POST /gradio_api/call/transcribe
Body: { "data": [{"path": "tmp/abc123.webm"}, true, "Auto"] }
→ Retourne: { "event_id": "xyz" }
```

**Étape 3 - Récupérer le résultat :**
```
GET /gradio_api/call/transcribe/{event_id}
Accept: text/event-stream
→ SSE avec: data: {"msg":"process_completed", "output":{"data":["texte bariba transcrit", ...]}}
```

---

## Fichiers à Modifier

### 1. `supabase/functions/bariba-stt/index.ts` — Refonte complète

**Changements :**
- Supprimer l'ancienne logique `callGradioSTT` avec queue/join et polling
- Implémenter la nouvelle chaîne : **base64 → Blob → Upload → Predict → Stream SSE**
- Permettre le health check **sans authentification** (déjà géré mais bugué)
- Améliorer l'extraction du résultat : le Space retourne un dict JSON `{"transcription": "...", "confidence": ..., ...}` ou simplement un string

**Nouvelle fonction principale :**
```typescript
async function transcribeWithGradioAPI(
  audioBase64: string,
  audioMimeType: string,
  robustMode: boolean,
  speakerType: string,
  hfToken: string
): Promise<string>

// Étapes :
// 1. Convertir base64 → Uint8Array
// 2. Upload vers /gradio_api/upload (multipart)
// 3. POST /gradio_api/call/transcribe avec {path, robust_mode, speaker_type}
// 4. GET /gradio_api/call/transcribe/{event_id} → lire SSE jusqu'à process_completed
// 5. Extraire le texte de output.data[0]
```

**Détection du format audio depuis le préfixe base64 :**
```typescript
// "data:audio/webm;base64,..." → mime="audio/webm", ext="webm"
// "data:audio/mp4;base64,..." → mime="audio/mp4", ext="mp4"
// Sinon défaut : "audio/webm", ext="webm"
```

### 2. `src/hooks/useBaribaSTT.ts` — Amélioration du feedback

**Changements :**
- Ajouter un `speakerType` par défaut configurable
- Ajouter un état `isWakingUp` pour afficher "Réveil du service..." quand le Space est froid (cold start ~30s)
- Mieux gérer les erreurs 503 (Space en veille) vs erreurs réelles

### 3. `src/pages/tamtam/TamTamDictionary.tsx` — Connexion STT pour la recherche vocale

**Changements :**
- Dans `handleVoiceCommand`, si `result.sourceLang === 'ba'` et `!result.transcription`, utiliser directement `useBaribaSTT` avec l'`audioBase64` pour obtenir la transcription Bariba
- Afficher un indicateur de progression STT dans l'interface du dictionnaire

### 4. `src/pages/tamtam/TamTamTranslator.tsx` — Feedback visuel STT

**Changements :**
- Afficher "🎤 Transcription Bariba en cours..." dans l'interface du traducteur pendant le STT
- Si la transcription réussit, afficher le texte bariba transcrit dans la zone source avant la traduction

---

## Résumé des Corrections

| Problème | Avant | Après |
|---|---|---|
| Health check | Rejeté (non authentifié) | Autorisé sans auth (audio courts) |
| Format audio | base64 inline dans data[] | Upload multipart → filepath |
| Appel API | Queue/join + polling 30x | Upload + Call + Stream SSE direct |
| Cold start | Pas de gestion | Timeout étendu 60s + message "réveil..." |
| Dictionnaire vocal | Pas de transcription bariba | STT bariba → recherche automatique |
| Traducteur vocal | STT bariba défaillant | STT bariba → texte source affiché |

---

## Comportement Attendu

1. Utilisateur appuie sur le micro dans le **Dictionnaire** en mode Bariba
2. L'enregistrement démarre → s'arrête → audio envoyé à `bariba-stt`
3. L'edge function uploade l'audio sur le Space HuggingFace via multipart
4. Le Space transcrit en Bariba (ex: "mère" → "yaari") 
5. La transcription remplit automatiquement le champ de recherche du dictionnaire
6. La définition correspondante s'affiche

Même flux pour le **Traducteur** : voix bariba → texte bariba → traduction française.
