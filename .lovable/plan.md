

## Diagnostic

**Pourquoi les boutons 🔊 ne sont pas visibles dans la capture (onglet Faagi)** :
- Dans `ClasseLessonView.tsx` les sections `observe/ecoute/reagis/retiens` rendent les questions via `<UniversalAnswerCard>` (le composant unifié)
- Or **`UniversalAnswerCard.tsx` n'inclut PAS de `<ListenButton>`** — il affiche juste le texte de la question
- Résultat : aucun bouton audio sur les questions des onglets Mɛɛrio / Faagi / Geruo / Weenɛ
- Idem pour `ClasseGestionN2`, `ClasseCalculView` exercices, `ClasseGrammaireN2`, `ClasseTextProdN2` qui passent tous par `UniversalAnswerCard` pour les Q&A

**Le bouton n'apparaît actuellement que** sur le texte principal de leçon, le titre d'évaluation et certains titres de calcul — pas sur les questions individuelles à cause du composant unifié.

## Plan d'implémentation

### 1. Ajouter `<ListenButton>` au cœur de `UniversalAnswerCard`

Modifier `UniversalAnswerCard.tsx` pour calculer automatiquement le `content_key` à partir des props `level/module/lessonId/sectionKey/questionIdx` (mapping identique à `classeContentKeys.ts`) et afficher 🔊 à côté du label de question.

→ Couvre instantanément **toutes les questions** de :
- Leçons N1 (observe/ecoute/reagis/retiens)
- Évaluations N1 et N2
- Calcul N1 et N2
- Gestion N2 (Q&A)
- Grammaire N2
- Production de textes N2

### 2. Ajouter une fonction `buildContentKey()` partagée

Nouveau helper dans `src/lib/classeContentKeys.ts` :
```ts
export function buildContentKey(level, module, lessonId, sectionKey?, idx?): string
```
Utilisé par `UniversalAnswerCard` et le studio enseignant pour garantir la même clé que celle enregistrée par l'enseignant.

### 3. Réponse vocale élève (voice answer) + corrigé vocal enseignant

**A. Migration DB** — ajouter à `classe_student_answers` :
- `answer_audio_path text` (chemin Storage)
- `answer_audio_duration numeric`

Ajouter à `classe_answer_keys` (déjà a `audio_url`) :
- `teacher_audio_path text` (chemin Storage privé pour audio enseignant)
- `teacher_audio_duration numeric`

**B. Bucket Storage** — nouveau bucket privé `classe-answers-audio` avec RLS :
- Élève : INSERT/SELECT/DELETE sur `{user_id}/...`
- Enseignant/admin : SELECT tout

**C. Composant `<VoiceAnswerRecorder>`** (nouveau)
- Réutilise `useAudioRecorder` + `blobToWav16kMono` (déjà en place)
- VU-meter, durée, bouton Stop, prévisualisation, "Envoyer ce vocal"
- Upload vers `classe-answers-audio` puis upsert dans `classe_student_answers` (champ `answer_audio_path`)

**D. Intégration dans `UniversalAnswerCard`**
- Toggle 2 modes : ✍️ Texte / 🎙️ Vocal
- L'élève peut envoyer **uniquement texte, uniquement vocal, ou les deux**
- Affichage en mode "submitted" : badges "📝 Réponse écrite" + "🎙️ Réponse vocale" + lecteur audio inline

**E. Côté enseignant `<AnswerReview>`**
- Affiche le lecteur audio de l'élève (signed URL)
- Permet à l'enseignant de saisir son corrigé en texte ET/OU d'enregistrer un corrigé vocal (même `<VoiceAnswerRecorder>`)
- Upload vers `classe-answers-audio/teacher/{key}.wav` → `teacher_audio_path` dans `classe_answer_keys`

**F. Affichage du corrigé enseignant** (dans `UniversalAnswerCard` zone feedback)
- Si `teacher_audio_path` existe → bouton "🎧 Écouter le corrigé du prof"
- Si `teacher_comment` existe → texte affiché (déjà OK)
- Les deux peuvent coexister

### 4. Mise à jour `syncAnswer`

Ajouter optionnellement `answerAudioPath` aux paramètres et le persister dans le upsert.

## Fichiers à créer / modifier

**Migration SQL**
- `supabase/migrations/...` : 
  - `ALTER TABLE classe_student_answers ADD COLUMN answer_audio_path text, answer_audio_duration numeric`
  - `ALTER TABLE classe_answer_keys ADD COLUMN teacher_audio_path text, teacher_audio_duration numeric`
  - Création bucket `classe-answers-audio` + RLS policies

**Nouveaux composants**
- `src/components/classe/VoiceAnswerRecorder.tsx` — enregistreur compact réutilisable
- `src/components/classe/VoiceAnswerPlayer.tsx` — lecteur audio compact (signed URL)

**Modifications**
- `src/lib/classeContentKeys.ts` — export `buildContentKey()`
- `src/components/classe/UniversalAnswerCard.tsx` — `<ListenButton>` sur la question + toggle texte/vocal + affichage réponse vocale + corrigé vocal enseignant
- `src/components/teacher/AnswerReview.tsx` — lecteur audio élève + recorder pour corrigé vocal enseignant
- `src/lib/classeSync.ts` — support `answerAudioPath` dans `syncAnswer`
- `src/lib/answerKeys.ts` — exposer `teacher_audio_path` dans `AnswerKey`

## Garanties

- **🔊 visible partout** automatiquement via `UniversalAnswerCard` (pas besoin de toucher aux pages individuelles)
- **Double modalité réponse** : texte + vocal indépendants ou combinés des deux côtés (élève ET enseignant)
- **Réutilise** intégralement le pipeline audio WAV 16kHz pro existant (pas de nouveau code audio)
- **RLS strictes** : élève ne voit que ses audios, enseignant voit tout, public ne voit rien
- **Compatibilité** : tous les anciens enregistrements texte continuent à fonctionner

## Hors scope

- Transcription auto vocal → texte (peut être ajouté ensuite via Lovable AI Whisper)
- Notation auto des réponses vocales

