

# Plan : Refonte complète du module Classe avec le contenu intégral du Manuel corrigé

## Contexte

Le fichier `Manuel_Bariba_N1_Corrige.html` (3269 lignes, 124 pages) contient l'intégralité du contenu pédagogique avec les caractères Bariba corrigés et les illustrations en base64. Le module Classe actuel ne contient que 17 leçons partielles avec du texte incomplet et sans illustrations. Il faut tout reconstruire.

## Structure du document source (124 pages)

Le manuel est organisé en deux grands blocs :

**Bloc LANGUE (pages 7-82)** : ~30 leçons de lecture/écriture, chacune suivant la structure :
- Page leçon : texte narratif + illustration (image base64) + questions (sections I à IV)
- Page phonétique : lettres/sons, syllabes, mots, phrases d'écriture

**Bloc CALCUL/DOORU (pages 83-124)** : ~20 leçons de mathématiques :
- Numération, Addition (avec/sans retenue), Soustraction, Multiplication, Division
- Chaque leçon : problème contextuel + questions + exercices de calcul

**4 Évaluations Yaayasiabu** intercalées (pages 16, 30, 48, 68 pour la langue ; pages 90, 100, 110, 120 pour le calcul)

## Ce qui change

### 1. Extraction automatisée du contenu (script Python)

Un script Python parsera le HTML complet pour extraire :
- Toutes les leçons avec leur texte intégral en Bariba corrigé
- Toutes les questions par section (I-Mɛɛrio, II-Faagi, III-Wunɛn yam, IV-Yè n weenɛ)
- Toutes les pages phonétiques (syllabes, mots, phrases d'écriture)
- Toutes les images base64 → sauvées comme fichiers PNG dans `public/classe/`
- Tous les exercices de calcul avec opérations et réponses
- Toutes les évaluations Yaayasiabu

### 2. Nouveau `src/data/classeContent.ts` (~2000+ lignes)

Reconstruction complète avec le contenu intégral :

```typescript
export interface ClasseLesson {
  id: number;
  title: string;
  theme: string;
  themeLabel: string;
  letters: string;
  text: string;           // texte narratif complet
  imageUrl?: string;       // chemin vers l'illustration
  observe: string[];       // Section I - A mɛɛrio
  ecoute: string[];        // Section II - A faagi yeni swaa dakio
  reagis: string[];        // Section III - A wunɛn yam waaru geruo
  retiens: string;         // Section IV - Yè n weenɛ a n yã
  phonetics: {
    label: string;         // sɔ̃ɔsiru label
    syllables: string[];
    words: string[];
    phrases: string[];
    writingExercise: string[];  // "a yora mɛɛrio"
  };
}
```

Les ~50 leçons langue + ~20 leçons calcul + 8 évaluations seront toutes présentes.

### 3. Thème clair moderne (style Learn/Apprendre)

Conversion de tout le module du thème sombre actuel (`bg-black`, `text-white`) vers le thème clair pastel utilisé par le module Apprendre :
- Fond : `bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50`
- Cartes : `bg-white rounded-3xl shadow-xl`
- Texte : `text-gray-800` / `text-gray-600`
- Accents : gradients amber/orange pour Langue, blue/indigo pour Calcul
- Boutons : `bg-white shadow-md rounded-full`

### 4. Composants UI refaits

**`FitilaClasse.tsx`** : Dashboard clair avec cartes blanches, progression visuelle colorée, icônes modernes

**`ClasseLessonView.tsx`** : Refait intégralement :
- Affichage de l'illustration du manuel (image extraite)
- Texte narratif complet avec mise en forme
- 5 onglets interactifs redesignés en style clair :
  - 👁️ Mɛɛrio (Observe) — questions + zones réponse
  - 🎧 Faagi (Écoute) — lecture du texte + questions
  - 💬 Geruo (Réagis) — questions ouvertes
  - 🧠 Weenɛ (Retiens) — phrase clé en grand
  - ✍️ Yora (Écris) — syllabes, mots, phrases avec feedback
- Navigation fluide Précédent/Suivant

**`ClasseAlphabetView.tsx`** : Grille alphabet en cartes blanches colorées, constructeur de syllabes interactif

**`ClasseCalculView.tsx`** : Refait avec toutes les leçons de calcul du manuel :
- Problèmes contextuels avec illustrations
- Questions par section (I-IV)
- Exercices interactifs avec vérification automatique
- Opérations posées visuellement

**`ClasseEvaluation.tsx`** : Quiz complet avec toutes les questions des 8 Yaayasiabu

### 5. Images extraites

Les ~40+ illustrations base64 embarquées dans le HTML seront extraites et sauvées dans `public/classe/` :
- `lesson-01.png`, `lesson-02.png`, etc.
- Référencées directement dans les données des leçons

## Fichiers modifiés/créés

| Action | Fichier |
|--------|---------|
| Script | `/tmp/extract_content.py` — parse HTML, extrait images et données |
| Recréer | `src/data/classeContent.ts` — contenu intégral |
| Images | `public/classe/*.png` — illustrations extraites |
| Refaire | `src/pages/fitila/FitilaClasse.tsx` — thème clair |
| Refaire | `src/components/classe/ClasseLessonView.tsx` — avec images et contenu complet |
| Refaire | `src/components/classe/ClasseAlphabetView.tsx` — thème clair |
| Refaire | `src/components/classe/ClasseCalculView.tsx` — contenu complet + thème clair |
| Refaire | `src/components/classe/ClasseEvaluation.tsx` — 8 évaluations complètes |
| Refaire | `src/components/classe/ClasseFacilitateur.tsx` — thème clair |

## Contraintes

- Contenu 100% issu du HTML corrigé (aucune invention)
- Caractères Bariba Unicode corrects (ɔ, ɛ, ɔ̃, ã, ĩ, ɔ̀, ǹ)
- Style clair pastel cohérent avec le module Apprendre
- Mobile-first, navigation simple

