
# Pipeline Audio Complet : Mistral STT + Inworld TTS pour Patrimoine & Voix du Village

## Ce qui doit être construit

Transformer le flux d'enregistrement audio dans `TamTamCreatePost.tsx` pour reproduire exactement le pipeline utilisé dans le Studio Griot :

1. **Enregistrement** → Transcription automatique via Mistral Voxtral Mini (STT)
2. **Transcription** → Génération audio via Inworld TTS-1.5 Mini avec choix de voix
3. **Audio généré** → Utilisé comme audio final publié dans le feed

---

## Étapes du nouveau flux

```text
[Enregistrer voix]
       ↓
[Détecter langue → Français]
       ↓
[Mistral Voxtral Mini STT → Texte transcrit]
       ↓
[Afficher texte + sélecteur de voix Inworld]
       ↓
[Générer audio TTS avec Inworld TTS-1.5 Mini]
       ↓
[Aperçu audio généré]
       ↓
[Publier avec audio TTS comme audio final]
```

---

## Changements techniques

### 1. Nouvelle étape `transcribing` dans `TamTamCreatePost.tsx`

Ajouter une étape intermédiaire entre `record` et `preview` :
- `record` → `transcribing` → `voice_select` → `generating` → `preview`

Nouvelles étapes UI :
- **`transcribing`** : Spinner + "Transcription en cours..." pendant l'appel Mistral
- **`voice_select`** : Affiche le texte transcrit + sélecteur de 4 voix Inworld (Timothy, Mark, Sarah, Alex avec indicateur M/F)
- **`generating`** : Spinner + "Génération de la voix..." pendant l'appel Inworld
- **`preview`** : Aperçu de l'audio Inworld généré (comme actuellement mais avec le TTS audio)

### 2. Arrêt automatique à la limite de temps

Dans le `useEffect` du timer, quand `recordingTime >= maxRecordingTime`, appeler automatiquement `stopRecording()` et déclencher la transcription.

### 3. Appel Mistral STT

Réutiliser l'edge function `transcribe-audio` déjà en place. Après `onstop`, envoyer le blob audio à l'edge function via FormData, récupérer le texte transcrit.

### 4. Sélecteur de voix Inworld

Afficher 4 cartes de voix disponibles :
- **Timothy** (M) — Ton grave, narratif
- **Mark** (M) — Ton neutre, clair
- **Sarah** (F) — Ton doux, chaleureux
- **Alex** (F) — Ton dynamique, expressif

Possibilité de passer cette étape (conserver l'audio original enregistré).

### 5. Appel Inworld TTS

Appeler l'edge function TTS existante (ou `UnifiedAudioService`) avec le texte transcrit et la voix sélectionnée. L'audio généré remplace l'audio enregistré comme `audio_base64` final.

---

## Fichiers modifiés

- **`src/components/tamtam/TamTamCreatePost.tsx`** : Ajout des étapes `transcribing`, `voice_select`, `generating` ; intégration Mistral STT et Inworld TTS ; arrêt auto à la limite ; sélecteur de voix

---

## Ce qui ne change pas

- Le mécanisme d'upload (blob → Supabase Storage `tamtam-audio`)
- La structure de publication (`onSubmit` avec `audio_base64`)
- Les templates et l'UI du feed
- Le VinylPlayer et les animations existantes
