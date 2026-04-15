

# Plan : Enrichissement interactif du module Classe N1 a partir du Guide et du Module de formation

## Contexte

Le module Classe actuel contient le contenu textuel du Manuel mais manque d'interactivite pedagogique. Le Guide d'enseignement et le Module de formation fournissent des informations structurelles essentielles :

**Du Guide d'enseignement (28 pages) :**
- Planification detaillee des 288 seances sur 48 semaines (6 seances/semaine)
- Les 8 themes avec leurs sous-themes et objectifs
- Structure des lecons langue (32 lecons) et calcul (13 lecons) avec leurs titres exacts
- Demarche pedagogique detaillee pour chaque rubrique (Amorce, Developpement, Evaluation)
- Alphabet Bariba complet avec majuscules/minuscules (page 25)
- Liste des objectifs d'apprentissage par domaine (SS, SVT, Yarumani)

**Du Module de formation (31 pages) :**
- Les 4 rubriques lecture-ecriture : Observe, Ecoute et reponds, Reagis, Retiens
- Les 5 rubriques maths : Observe, Ecoute et reponds, Resous/Ecris, Retiens, Entraine-toi
- Demarche d'enseignement en lecture-ecriture : Amorce > Developpement (lecture maitre, comprehension, phonetique, ecriture) > Evaluation
- Demarche d'enseignement en maths : Amorce > Developpement (probleme contextuel, resolution, entrainement) > Evaluation
- Principes d'andragogie (pedagogie des adultes)

## Ce qui va changer

### 1. Systeme de correction et verification des reponses

**Lecons de langue** — Ajout de reponses attendues et feedback :
- Section Meerio (Observe) : questions a reponse ouverte avec indices visuels
- Section Faagi (Ecoute) : questions avec reponses-cles extraites du texte narratif. L'apprenant ecrit sa reponse, puis clique "Verifier" pour voir la bonne reponse et un score (vert/rouge)
- Section Weene (Retiens) : affichage de la phrase-cle avec un exercice de completion a trous
- Section Yora (Ecris) : verification lettre par lettre avec score en points (ex: 3/5 correct)

**Lecons de calcul** — Exercices dynamiques interactifs :
- Numeration : glisser-deposer pour ordonner les nombres, input pour ecrire le nombre en Bariba
- Addition/Soustraction : operations posees visuellement avec colonnes (unites, dizaines, centaines), l'apprenant remplit chaque case
- Multiplication/Division : meme systeme de colonnes avec retenue visible
- Verification automatique : score instantane avec animation (confettis si tout juste)
- Bouton "Recommencer" pour refaire les exercices
- "Entraine-toi" : exercices generes dynamiquement a partir des regles du manuel

### 2. Systeme de progression et maitrise

**Progression par lecon :**
- Chaque lecon a 4-5 onglets. Chaque onglet complete = une etoile
- Pour completer un onglet : repondre a au moins 80% des questions ou exercices
- Barre de progression par lecon visible dans la liste
- Etoiles affichees : 0 a 5 etoiles par lecon

**Progression globale enrichie :**
- Progression separee Langue vs Calcul sur le dashboard
- Nombre de lecons maitrisees (toutes etoiles) vs partiellement completees
- Score moyen aux evaluations (Yaayasiabu)
- Deblocage sequentiel : lecon N+1 accessible seulement si lecon N a au moins 3 etoiles
- Badge "Sɔ̃ɔsiru kobu" (Maitrise) quand toutes les lecons d'un theme sont completees

**Sauvegarde locale enrichie :**
```typescript
interface ClasseProgress {
  completedLessons: number[];
  lessonStars: Record<number, number>; // 0-5 etoiles
  tabsCompleted: Record<string, boolean>; // "lesson_1_observe": true
  evaluationScores: Record<number, number>;
  calculScores: Record<number, { score: number; total: number }>;
  lastLesson: number;
  themeBadges: string[]; // themes maitrises
}
```

### 3. Calcul dynamique et interactif

Refonte complete de `ClasseCalculView.tsx` :

- **Numeration (lecon 1)** : Affichage visuel de billes/cubes pour compter 0-9, input pour ecrire le chiffre
- **Addition sans retenue (lecon 2)** : Operation posee avec 2 lignes, l'apprenant tape le resultat chiffre par chiffre
- **Addition avec retenue (lecon 3)** : Meme systeme avec une ligne "retenue" visible
- **Soustraction sans/avec retenue (lecons 4-5)** : Colonnes avec emprunt visible
- **Multiplication (lecons 6-8)** : Table de multiplication interactive + operations posees
- **Division (lecons 9-10)** : Division posee avec quotient et reste
- **Problemes contextuels** : Texte du probleme en Bariba avec illustration, l'apprenant choisit l'operation puis calcule
- **Verification instantanee** : Chaque reponse est verifiee automatiquement avec feedback colore

### 4. Evaluations (Yaayasiabu) enrichies

- Questions a choix multiples quand applicable (extraites du texte)
- Score en points (pas juste % de champs remplis)
- Affichage de la correction complete apres soumission
- Possibilite de "Refaire" l'evaluation
- Score historique visible (meilleur score)

### 5. Facilitateur enrichi avec le contenu du Guide et Module

Refonte de `ClasseFacilitateur.tsx` avec le contenu reel :
- Demarche detaillee lecture-ecriture (6 phases du Module)
- Demarche detaillee maths (5 phases du Module)
- Planning des 48 semaines (du Guide)
- Principes d'andragogie (du Module)
- Fiches pedagogiques modeles

### 6. Enrichissement du contenu de donnees

Script d'extraction pour completer `classeContent.ts` avec :
- Reponses attendues pour chaque question (extraites du texte narratif)
- Titres des 13 lecons calcul du Guide (Geetinu, Wɔkure, Wunɔɔre, etc.)
- Objectifs d'apprentissage par theme
- Les 8 themes SS et SVT avec sous-themes detailles

## Fichiers modifies

| Action | Fichier |
|--------|---------|
| Script | `/tmp/enrich_content.py` — extrait reponses et metadata du Guide/Module |
| Modifier | `src/data/classeContent.ts` — ajouter reponses, scores, metadata calcul |
| Refaire | `src/components/classe/ClasseCalculView.tsx` — operations interactives dynamiques |
| Refaire | `src/components/classe/ClasseEvaluation.tsx` — correction, refaire, historique |
| Modifier | `src/components/classe/ClasseLessonView.tsx` — verification reponses, progression etoiles |
| Refaire | `src/components/classe/ClasseFacilitateur.tsx` — contenu reel Guide + Module |
| Modifier | `src/pages/fitila/FitilaClasse.tsx` — progression enrichie, deblocage, badges |

## Contraintes

- Contenu 100% issu des 3 documents (Manuel, Guide, Module)
- Caracteres Bariba Unicode corrects
- Style clair pastel coherent avec le module Apprendre
- Mobile-first, navigation simple
- Aucune API externe requise, tout fonctionne en local

