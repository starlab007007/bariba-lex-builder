

# Plan : Système complet de suivi enseignant/apprenant pour le module Classe

## Vision

Transformer le module Classe d'un système 100% local (localStorage anonyme) en une plateforme e-learning complète avec :
- **Apprenants connectés** : leurs réponses, scores et progression sont sauvegardés en cloud (jamais perdus)
- **Enseignants** : un nouveau rôle `teacher` avec tableau de bord dédié pour suivre les apprenants, voir leurs réponses, noter et corriger
- **Admin** : assigne le rôle `teacher` depuis la gestion existante des rôles

## Architecture base de données (5 nouvelles tables)

### 1. `app_role` enum — ajouter la valeur `teacher`
Étendre l'enum existant `{admin, user, editor}` → `{admin, user, editor, teacher}`.

### 2. `classe_student_progress` — progression par apprenant et niveau
| Colonne | Type | Description |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK auth.users (NOT NULL) |
| level | text | 'N1' ou 'N2' |
| completed_lessons | int[] | Leçons terminées |
| lesson_stars | jsonb | `{ "1": 5, "2": 3 }` |
| tabs_completed | jsonb | `{ "lesson_1_observe": true }` |
| last_lesson_id | int | Dernière leçon vue |
| theme_badges | text[] | Badges débloqués |
| updated_at | timestamptz | |

UNIQUE(user_id, level)

### 3. `classe_student_answers` — toutes les réponses (Q&R, calcul, gestion, grammaire, textprod)
| Colonne | Type | Description |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NOT NULL |
| level | text | 'N1' / 'N2' |
| module | text | 'lesson' / 'calcul' / 'evaluation' / 'gestion' / 'grammaire' / 'textprod' |
| lesson_id | text | id de leçon ou clé du document |
| section_key | text | ex: 'I', 'II', 'sosibu', etc. |
| question_idx | int | Index de la question |
| answer_text | text | Réponse de l'élève |
| field_data | jsonb | Pour formulaires complexes (gestion : facture, reçu) |
| score | numeric | Auto-calculé pour les exos math |
| max_score | numeric | |
| teacher_grade | numeric | Note manuelle de l'enseignant |
| teacher_comment | text | Correction / commentaire enseignant |
| graded_by | uuid | FK auth.users (enseignant) |
| graded_at | timestamptz | |
| submitted_at | timestamptz | |
| updated_at | timestamptz | |

UNIQUE(user_id, level, module, lesson_id, section_key, question_idx)

### 4. `classe_evaluation_results` — scores d'évaluations
| user_id, level, evaluation_id, score, best_score, attempts, completed_at |

### 5. `classe_teacher_assignments` — relation enseignant ↔ apprenants (optionnel pour ciblage)
| teacher_id, student_id, level, assigned_at | + RLS

### Fonctions sécurité
- `has_role(uid, 'teacher')` (déjà existant)
- `is_teacher_or_admin(uid)` security definer

### Politiques RLS
- **Apprenants** : SELECT/INSERT/UPDATE uniquement leurs propres lignes
- **Enseignants** : SELECT sur tous les `classe_*`, UPDATE uniquement `teacher_grade` / `teacher_comment` / `graded_by` / `graded_at`
- **Admin** : ALL

## Migration progressive du localStorage → cloud

Créer une **couche d'abstraction** `src/lib/classeSync.ts` :
- Si utilisateur connecté → lecture/écriture Supabase + cache mémoire
- Si non connecté → bandeau "Connectez-vous pour sauvegarder vos réponses"
- Fonction one-time `migrateLocalToCloud()` à la connexion : push le localStorage existant vers Supabase

Adapter `getClasseProgress`, `saveCalculAnswer`, `saveGestionN2*`, etc. pour passer par cette couche (signature inchangée → zéro casse en aval).

## Nouveau tableau de bord enseignant : `/fitila/teacher`

Composants :
- **`TeacherDashboard.tsx`** — vue d'ensemble : nb apprenants, copies à corriger, dernières activités, stats par niveau
- **`StudentList.tsx`** — table triable (nom, niveau, % progression, dernière activité, leçons complétées, moyenne)
- **`StudentDetail.tsx`** — fiche apprenant : timeline d'activité, progression par module, accès direct à toutes ses réponses
- **`AnswerReview.tsx`** — affiche question + réponse de l'élève + champ note (0-20) + zone commentaire + bouton "Valider correction"
- **`PendingGrading.tsx`** — file d'attente des réponses non notées, filtrable par module/niveau
- **`ClassStats.tsx`** — graphiques Recharts : progression moyenne, taux de complétion, scores moyens par leçon

Route protégée par `ProtectedRoute` avec `requireTeacher` (nouvelle prop).

## Vue apprenant enrichie

Ajouter dans `FitilaClasse` :
- Bandeau **"Connectez-vous pour sauvegarder votre progression"** si non authentifié (avec CTA → `/fitila/auth`)
- Nouvel onglet **"Mes corrections"** : liste des réponses notées par l'enseignant avec note + commentaire
- Badges visuels sur les exercices corrigés (✓ vert avec note)
- Synchronisation auto à chaque saisie via debounce 800ms

## Admin — assignation du rôle teacher

Étendre `src/components/admin/UserRoleManager.tsx` :
- Ajouter `teacher` dans le sélecteur de rôles (à côté de admin/editor)
- Nouvelle section "Enseignants actifs" avec compteur d'apprenants suivis

## Routes

```text
/fitila/teacher              → Dashboard enseignant (rôle teacher requis)
/fitila/teacher/students     → Liste apprenants
/fitila/teacher/student/:id  → Détail apprenant
/fitila/teacher/grading      → File de correction
/fitila/teacher/stats        → Statistiques classe
/fitila/classe/corrections   → Vue apprenant : ses copies notées
```

## Fichiers à créer/modifier

### Nouveaux fichiers
- Migration SQL (5 tables + RLS + enum extension)
- `src/lib/classeSync.ts` — couche localStorage ↔ Supabase
- `src/hooks/useTeacherRole.ts` — hook role check
- `src/hooks/useStudentProgress.ts` — fetch progression élève
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/pages/teacher/StudentList.tsx`
- `src/pages/teacher/StudentDetail.tsx`
- `src/pages/teacher/PendingGrading.tsx`
- `src/pages/teacher/ClassStats.tsx`
- `src/components/teacher/AnswerReview.tsx`
- `src/components/teacher/ProgressChart.tsx`
- `src/components/classe/AuthGuardBanner.tsx` — bandeau "connectez-vous"
- `src/components/classe/ClasseCorrections.tsx` — vue corrections élève

### Fichiers modifiés
- `src/data/classeContent.ts` & `classeContentN2.ts` — déléguer à `classeSync.ts`
- `src/components/classe/ClasseCalculView.tsx` — sync auto à la frappe
- `src/components/classe/ClasseGestionN2.tsx` — sync auto
- `src/components/classe/ClasseEvaluation.tsx` — sync scores
- `src/components/admin/UserRoleManager.tsx` — ajouter rôle teacher
- `src/components/ProtectedRoute.tsx` — ajouter `requireTeacher`
- `src/App.tsx` — routes `/fitila/teacher/*`
- `src/pages/fitila/FitilaClasse.tsx` — bandeau auth + onglet corrections

## Sécurité (critique)

- Le rôle `teacher` est attribué **uniquement par un admin** (RLS sur `user_roles`)
- Les enseignants peuvent **noter** mais pas modifier les réponses des élèves
- Les élèves voient uniquement leurs propres données (RLS strict)
- Toutes les vérifications de rôle utilisent `has_role()` security definer (pas de récursion RLS)
- Validation Zod côté client + côté SQL (length limits, score 0-20)

## Garanties

- **Aucune perte de données existante** : migration douce du localStorage au login
- **Mode hors-ligne** : continue à écrire en localStorage si réseau down, sync au retour
- **Mobile-first** : tableaux de bord teacher responsifs avec vue carte sur mobile
- **Cohérence visuelle** : reprend le style pastel/cohérent du module Classe actuel
- **i18n** : labels FR/Bariba comme partout dans Fitila

