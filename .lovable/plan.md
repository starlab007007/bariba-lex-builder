

# Plan : Module "Classe" -- Niveau 1 Bariba

## Contexte

Les trois documents PDF fournissent un programme complet d'alphabétisation en Bariba (Baatonum) Niveau 1 :

- **Manuel de l'apprenant** : 50 lecons organisees en 8 themes (Tii dobonu, Baa ka maeron, Goo yeru, Gonnaru, Taetae toobu, Sekuru, Saem, Woo pii), chacune avec les rubriques Observe, Ecoute et reponds, Reagis, Retiens, Entraine-toi, plus des lettres/sons a apprendre et 4 evaluations periodiques (Yaayasiabu).
- **Guide d'enseignement** : Demarche pedagogique (Amorce, Developpement, Evaluation), alphabet Bariba complet (voyelles + consonnes), planification des 288 seances.
- **Module de formation** : Langue (alphabet, grammaire, tons), Mathematique/Gestion (numeration, 4 operations, mesures, monnaie), andragogie.

## Ce qui sera cree

### 1. Fichier de donnees statique : `src/data/classeContent.ts`

Contient TOUT le contenu extrait des documents, structure ainsi :

```typescript
// Structure des lecons du Manuel
export const CLASSE_LESSONS = [
  {
    id: 1, title: 'Bææræ sariru', theme: 'tii_dobonu',
    letter: 'u, a, k',
    text: '...', // texte introductif du manuel
    observe: ['...'], // questions Observe
    ecoute: ['...'],  // questions Ecoute et reponds
    reagis: ['...'],  // questions Reagis
    retiens: '...',   // phrase cle
    entraineToi: { syllables: [...], words: [...], phrases: [...] },
  },
  // ... 50 lecons
];

export const EVALUATIONS = [
  { id: 1, title: 'Yaayasiabu gbiikibu', afterLesson: 6, questions: [...] },
  { id: 2, title: 'Yaayasiabu yiruse', afterLesson: 13, questions: [...] },
  { id: 3, title: 'Yaayasiabu itase', afterLesson: 22, questions: [...] },
  { id: 4, title: 'Yaayasiabu nnæse', afterLesson: 30, questions: [...] },
];

// Alphabet Bariba complet (du Guide)
export const BARIBA_ALPHABET = {
  vowels: ['a','æ','e','ɛ','i','o','ø','u'],
  consonants: ['b','d','g','h','k','m','n','p','r','s','t','w','y'],
};

// Calcul & Gestion (du Module de formation)
export const CALCUL_LESSONS = [
  { id: 'numeration', title: 'Numération', content: '...' },
  { id: 'addition', title: 'Addition', content: '...' },
  { id: 'soustraction', title: 'Soustraction', content: '...' },
  { id: 'multiplication', title: 'Multiplication', content: '...' },
  { id: 'division', title: 'Division', content: '...' },
  { id: 'mesures', title: 'Mesures (longueur, masse, capacité)', content: '...' },
  { id: 'monnaie', title: 'Monnaie', content: '...' },
];

// Mode Facilitateur (du Guide)
export const FACILITATOR_GUIDE = {
  amorce: '...',
  developpement: '...',
  evaluation: '...',
  conseils: ['...'],
};
```

### 2. Page principale : `src/pages/fitila/FitilaClasse.tsx`

Vue "Accueil Classe" avec :
- Selection Niveau 1 (actif) / Niveau 2 (verrouille avec cadenas)
- 6 sections sous forme de cartes :
  - 📖 Lecons (50 lecons groupees par theme)
  - 🔤 Lecture & Ecriture (alphabet, voyelles, consonnes)
  - 🔢 Calcul & Gestion (numeration, operations, mesures)
  - 📝 Evaluations (4 evaluations periodiques + finale)
  - 👨‍🏫 Mode Facilitateur (guide pedagogique)
  - 📊 Ma Progression (score, lecons terminees)

### 3. Sous-composants dans `src/components/classe/`

| Composant | Role |
|-----------|------|
| `ClasseLessonView.tsx` | Affiche une lecon avec ses 5 rubriques interactives (Observe > Ecoute > Reagis > Retiens > Entraine-toi) avec navigation Suivant/Precedent |
| `ClasseAlphabetView.tsx` | Grille de l'alphabet Bariba, exercices de lecture guidee, formation de syllabes/mots |
| `ClasseCalculView.tsx` | Numeration, operations avec exercices interactifs (reponse libre + feedback) |
| `ClasseEvaluation.tsx` | Quiz avec questions du manuel, score affiche, barre de progression |
| `ClasseFacilitateur.tsx` | Demarche Amorce/Developpement/Evaluation, conseils pour animateurs |
| `ClasseProgressBar.tsx` | Barre de progression par theme |

### 4. Interactions utilisateur par rubrique

| Rubrique | Type d'interaction |
|----------|-------------------|
| 👁 Observe | Questions affichees, l'utilisateur repond par choix ou texte libre, bouton "audio" pour ecouter en Bariba |
| 🎧 Ecoute et reponds | Questions avec zone de reponse texte, feedback correct/a revoir |
| 💬 Reagis | Questions ouvertes avec zone de texte, pas de correction auto |
| 🧠 Retiens | Phrase cle affichee en grand, bouton ecouter, copie dans un carnet |
| ✍ Entraine-toi | Exercices : associer syllabes, ecrire des mots (input), construire phrases. Feedback immediat |
| 🔢 Calcul | Exercices numeriques avec input chiffre, verification automatique |
| 📝 Evaluation | QCM 5-10 questions, score affiche a la fin |

### 5. Integration dans l'app

- **Route** : Ajouter `/fitila/classe` dans `App.tsx`
- **Menu lateral** : Ajouter dans `FitilaApp.tsx` > `toolsItems` :
  ```
  { emoji: '🏫', labelKey: 'sidebar_classe', descKey: 'sidebar_classe_desc', path: '/fitila/classe', gradient: 'from-rose-500 to-pink-400' }
  ```
- **Traductions** : Ajouter les cles dans le contexte de langue Fitila

### 6. Stockage progression (localStorage)

Pas de base de donnees necessaire pour la V1 -- la progression sera stockee en localStorage :
- Lecons completees
- Scores d'evaluations
- Derniere lecon visitee

## Fichiers a creer/modifier

| Action | Fichier |
|--------|---------|
| Creer | `src/data/classeContent.ts` (~800 lignes, tout le contenu des 3 documents) |
| Creer | `src/pages/fitila/FitilaClasse.tsx` (page principale) |
| Creer | `src/components/classe/ClasseLessonView.tsx` |
| Creer | `src/components/classe/ClasseAlphabetView.tsx` |
| Creer | `src/components/classe/ClasseCalculView.tsx` |
| Creer | `src/components/classe/ClasseEvaluation.tsx` |
| Creer | `src/components/classe/ClasseFacilitateur.tsx` |
| Modifier | `src/App.tsx` (ajouter route `/fitila/classe`) |
| Modifier | `src/pages/fitila/FitilaApp.tsx` (ajouter dans toolsItems du menu lateral) |

## Contraintes respectees

- Contenu 100% issu des 3 documents fournis
- Aucun contenu invente ou externe
- Structure pedagogique du manuel preservee
- Interface simple adaptee a un faible niveau d'alphabetisation
- Compatible mobile, navigation Suivant/Precedent
- Pret pour ajout audio (bariba-tts) ulterieur

