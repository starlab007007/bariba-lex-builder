

# Plan : Système complet de notation pondérée + relevé de notes

## Vision

Transformer le suivi enseignant/apprenant en un **vrai système scolaire** : notes par question → moyennes pondérées par leçon → section → chapitre → globale, avec relevés de notes téléchargeables et vue comparative apprenant ↔ enseignant.

## Ce qu'on construit

### 1. Modèle de notation (DB)

Nouvelle table `classe_grade_weights` (poids par question/section/leçon, configurables par enseignant) :
- `level`, `module`, `lesson_id`, `section_key`, `question_idx`
- `weight` (numeric, défaut 1.0) → pondération de la question dans sa section
- `section_weight` (numeric) → pondération de la section dans la leçon
- `lesson_weight` (numeric) → pondération de la leçon dans le chapitre

Nouvelle table `classe_chapters` (regroupement leçons en chapitres) :
- `level`, `chapter_key`, `title_fr`, `title_ba`, `lesson_ids[]`, `order_index`

Vue SQL `classe_student_grades_aggregated` qui calcule en temps réel :
- Note pondérée par leçon (somme questions × poids / total poids × 20)
- Note pondérée par section
- Note pondérée par chapitre
- Moyenne globale par module et niveau

### 2. Côté enseignant — Notation enrichie

**Améliorer `AnswerReview.tsx`** :
- Afficher infos enseignant qui corrige (nom, avatar) automatiquement via `graded_by`
- Champ poids de la question (1-5) directement dans l'interface
- Note /20 + appréciation textuelle libre

**Nouvelle page `WeightsManager.tsx`** (`/fitila/teacher/weights`) :
- Tableau pour configurer les poids par leçon/section/question
- Import/export CSV des barèmes
- Templates par défaut (égal, progressif, examen)

**Nouvelle page `GradeOverview.tsx`** (`/fitila/teacher/grades`) :
- Tableau croisé : élèves en lignes × leçons en colonnes
- Cellules colorées (vert ≥16, ambre 10-15, rouge <10)
- Export PDF/CSV du relevé global de classe

### 3. Côté apprenant — Mes corrections enrichies

**Refonte `ClasseCorrections.tsx`** :
- **Vue comparative side-by-side** : ma réponse | réponse(s) acceptée(s) | différence (highlight des mots manquants/erronés)
- **Carte enseignant** : avatar + nom + appréciation
- **Note pondérée affichée** : "Q3 : 14/20 (poids ×2 = 28 pts sur 40)"

**Nouveau composant `MyGradeReport.tsx`** (`/fitila/classe/notes`) :
- **Relevé de notes hiérarchique** :
  - Vue globale (moyenne /20 par module N1+N2)
  - Détail par chapitre → section → leçon → question
  - Graphique radar (Recharts) progression par module
  - Appréciation auto-générée selon moyenne ("Excellent", "Bien", "À revoir")
- **Bouton télécharger relevé PDF** (jsPDF + autoTable)
- **Auto-évaluation** : l'apprenant peut noter sa propre confiance /20 par leçon (table `classe_self_assessments`)

### 4. Calcul des moyennes (logique partagée)

Nouveau fichier `src/lib/grading.ts` :
```ts
computeQuestionGrade(answer, weight) → { weighted, raw, max }
computeSectionAverage(questions[]) → /20 pondérée
computeLessonAverage(sections[]) → /20 pondérée
computeChapterAverage(lessons[]) → /20 pondérée
computeGlobalAverage(chapters[], moduleWeights) → /20
getAppreciation(grade) → "Excellent" | "Très bien" | ... | "À revoir"
```

### 5. Comparaison visuelle (diff)

Composant `AnswerDiff.tsx` :
- Tokenize ma réponse + réponse modèle
- Highlight vert mots corrects, rouge mots manquants, barré mots en trop
- Score de similarité (Levenshtein normalisé)

## Fichiers impactés

**Nouveaux** :
- Migration SQL : `classe_grade_weights`, `classe_chapters`, `classe_self_assessments`, vue agrégée + RLS
- `src/lib/grading.ts` (calculs pondérés + appréciations)
- `src/components/classe/AnswerDiff.tsx` (comparaison visuelle)
- `src/components/classe/MyGradeReport.tsx` (relevé apprenant)
- `src/components/classe/SelfAssessment.tsx` (auto-éval)
- `src/pages/teacher/WeightsManager.tsx`
- `src/pages/teacher/GradeOverview.tsx`
- `src/lib/pdfReport.ts` (génération relevé PDF)

**Modifiés** :
- `src/components/classe/ClasseCorrections.tsx` (vue comparative + diff + infos prof)
- `src/components/teacher/AnswerReview.tsx` (champ poids + appréciation)
- `src/pages/teacher/TeacherLayout.tsx` (nav : Poids, Vue notes)
- `src/pages/classe/ClasseHome.tsx` (nouvelle tuile "Mon relevé")
- `src/App.tsx` (routes `/fitila/classe/notes`, `/fitila/teacher/weights`, `/fitila/teacher/grades`)

## Sécurité

- Poids modifiables par `is_teacher_or_admin` uniquement
- Auto-évaluations : RLS strict (apprenant voit/écrit ses propres ; prof lecture seule)
- Vue agrégée filtrée par RLS sur tables sources (pas de fuite)

## Garanties

- **Rétrocompatibilité** : si pas de poids défini → poids 1.0 partout (moyenne arithmétique simple)
- **Performance** : vue matérialisée rafraîchie via trigger sur `classe_student_answers`
- **PDF** : utilise `jspdf` + `jspdf-autotable` (déjà dans bundle si autres rapports, sinon ajout léger)
- **Mobile-first** : relevés en cartes empilables sur petit écran, tableau sur desktop

