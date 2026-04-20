

# Plan — Corriger les 5 problèmes audio

## Diagnostic (résumé)

| # | Problème | Cause racine |
|---|----------|--------------|
| 1 | Audios élèves invisibles côté enseignant | `PendingGrading.tsx` & `StudentDetail.tsx` ne sélectionnent PAS `answer_audio_path` / `answer_audio_duration` dans la requête SQL |
| 2 | Pas de corrigé vocal possible côté enseignant | En réalité `AnswerReview.tsx` a déjà le recorder, MAIS il s'enregistre dans `classe_answer_keys.teacher_audio_path` — pas relié à la réponse spécifique de l'élève. Il faut deux options : corrigé vocal **personnalisé** (par réponse) OU **général** (par question) |
| 3 | Pas de bouton 🔊 dans la section **Sɔ̃ɔsiru** (phonétique) des leçons | `ClasseLessonView.tsx` rend les lignes `phonetics.reading` et `phonetics.writing` en simples `<p>` / `<span>` sans `<ListenButton>`. Le générateur de clés les couvre déjà (`phonetics/reading/{i}`, `phonetics/writing/{i}`) — il manque juste l'UI |
| 4 | **Échec d'upload audio Alphabet** côté enseignant | La contrainte CHECK `module IN ('lang','calcul','eval','gestion','grammaire','textprod')` **n'inclut pas `'alphabet'`**. Toute INSERT alphabet est rejetée par Postgres |
| 5 | Apprenant ne voit pas ses corrections vocales/audio dans **Mes corrections** | `ClasseCorrections.tsx` ne sélectionne pas `answer_audio_path`, `answer_audio_duration` côté élève, ni `teacher_audio_path` côté `classe_answer_keys` |

## Implémentation

### A. Migration SQL (1 seule)

```sql
-- 1. Autoriser le module 'alphabet' (corrige bug upload Alphabet)
ALTER TABLE classe_content_audios DROP CONSTRAINT classe_content_audios_module_check;
ALTER TABLE classe_content_audios ADD CONSTRAINT classe_content_audios_module_check
  CHECK (module IN ('lang','calcul','eval','gestion','grammaire','textprod','alphabet'));

-- 2. Ajouter le corrigé vocal personnalisé par réponse (en complément du général dans answer_keys)
ALTER TABLE classe_student_answers
  ADD COLUMN IF NOT EXISTS teacher_audio_path text,
  ADD COLUMN IF NOT EXISTS teacher_audio_duration numeric;
```

### B. Côté enseignant — Voir & corriger les vocaux élèves

**`src/pages/teacher/PendingGrading.tsx`**
- Ajouter `answer_audio_path, answer_audio_duration` dans le SELECT
- (le rendu via `<AnswerReview>` affiche déjà le `<VoiceAnswerPlayer>` quand le path est présent)

**`src/pages/teacher/StudentDetail.tsx`**
- Ajouter `answer_audio_path, answer_audio_duration` dans le SELECT

**`src/components/teacher/AnswerReview.tsx`**
- Ajouter un **2ᵉ enregistreur "Corrigé personnalisé pour cet élève"** qui upload vers `classe-answers-audio/teacher/{answer.id}.webm` et met à jour `classe_student_answers.teacher_audio_path` (en plus du corrigé général déjà présent dans `classe_answer_keys`)
- Dans la zone correction, présenter clairement les 2 options : **✍️ Texte** + **🎙️ Vocal** (l'enseignant peut envoyer l'un, l'autre, ou les deux)

### C. Côté apprenant — Voir le corrigé vocal personnalisé

**`src/components/classe/UniversalAnswerCard.tsx`** (déjà fait pour le corrigé général)
- Ajouter `teacher_audio_path, teacher_audio_duration` au SELECT et afficher un `<VoiceAnswerPlayer variant="teacher" label="Corrigé vocal de l'enseignant">` dans la zone feedback

**`src/components/classe/ClasseCorrections.tsx`** (Mes corrections)
- Ajouter dans le SELECT : `answer_audio_path, answer_audio_duration, teacher_audio_path, teacher_audio_duration`
- Afficher pour chaque item :
  - Lecteur de **ma réponse vocale** (si présente)
  - Lecteur du **corrigé vocal de l'enseignant** (si présent)
  - Conserver l'affichage texte existant (réponse, corrigé, note, commentaire)

### D. Bouton 🔊 dans la section Sɔ̃ɔsiru (phonétique)

**`src/components/classe/ClasseLessonView.tsx`** (onglet `phonetics`)
- Pour chaque ligne `phonetics.reading[i]` : ajouter `<ListenButton contentKey={\`classe/N1/lang/${lessonId}/phonetics/reading/${i}\`} />` à côté
- Pour chaque mot `phonetics.writing[i]` : idem avec `phonetics/writing/${i}`
- N1 uniquement (les phonetics N2 passent par `ClasseGrammaireN2` déjà couvert)

### E. Récapitulatif fichiers

**Migration**
- `supabase/migrations/...add_alphabet_module_and_personal_teacher_audio.sql`

**Modifications**
- `src/pages/teacher/PendingGrading.tsx` — SELECT enrichi
- `src/pages/teacher/StudentDetail.tsx` — SELECT enrichi
- `src/components/teacher/AnswerReview.tsx` — 2ᵉ recorder "corrigé personnalisé pour cet élève" + upsert sur `classe_student_answers`
- `src/components/classe/UniversalAnswerCard.tsx` — SELECT + lecture corrigé vocal personnalisé
- `src/components/classe/ClasseCorrections.tsx` — SELECT + lecteurs audio (réponse élève + corrigé enseignant)
- `src/components/classe/ClasseLessonView.tsx` — `<ListenButton>` sur chaque ligne phonétique

## Garanties

- ✅ Audios élèves immédiatement visibles dans `PendingGrading` et `StudentDetail`
- ✅ Enseignant : double option (texte + vocal) avec corrigé vocal **personnalisé** par élève (en plus du corrigé général)
- ✅ Section Sɔ̃ɔsiru : bouton 🔊 sur chaque ligne (lecture + écriture)
- ✅ Upload Alphabet fonctionnel (constraint corrigée)
- ✅ Mes corrections : élève entend sa propre réponse + le corrigé vocal de l'enseignant

## Hors scope
- Transcription IA des vocaux (à demander explicitement plus tard)

