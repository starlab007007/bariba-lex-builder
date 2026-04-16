

# Plan : Restructuration du Niveau 2 — Modules separes et contenu complet

## Problemes identifies

1. **Module Alphabet** affiche dans N2 alors qu'il n'existe pas au Niveau 2
2. **7 lecons de langue manquantes** (Part 2, pages 54-70) : Dãa bɔɔriban girabu, Gɔɔ teɔ, Sina wɔnɔ goon mwabu, Gannigin bàraru, Bake Sika ka sɛm sɔm kowobu, À n tii kĩ a tii nɔɔri, Saaton gɔɔ
3. **5 lecons de calcul manquantes** (pages 122-130) : À n dò mɔrun gaari koo yeru, Sunɔ Kom diru, Gominan gobi bɔkuraru, Gaatan dii kpɛɛrun yãa dwebu, Su ka tii yinan yigbɛru
4. **Pas de separation Part 1 / Part 2** — tout est melange dans un seul module "Lecons"

## Architecture cible du N2

Le N2 aura **4 modules** au lieu de 5 (pas d'Alphabet) :

```text
┌─────────────────────────────────────────┐
│           NIVEAU 2 — Home               │
├──────────────┬──────────────────────────┤
│ 📖 Part 1   │ Garibu ka yora           │
│   (Langue)   │ 25 lecons + 5 evals     │
├──────────────┼──────────────────────────┤
│ 🔢 Part 2   │ Dooru ka yarumani        │
│   (Calcul)   │ 30 lecons + 5 evals     │
├──────────────┼──────────────────────────┤
│ 📝 Yaayasia  │ Evaluations combinees    │
│              │ Langue + Calcul          │
├──────────────┼──────────────────────────┤
│ 👨‍🏫 Guide   │ Facilitateur N2          │
└──────────────┴──────────────────────────┘
```

## Modifications

### 1. `src/data/classeContentN2.ts` — Ajouter contenu manquant

**Lecons langue 19-25** (extraites exhaustivement du Manuel N2 pages 54-70) :
- 19: Dãa bɔɔriban girabu (Dãa bɔɔriba)
- 20: Gɔɔ teɔ (Gɔɔ teɔ)
- 21: Sina wɔnɔ goon mwabu (Sina wɔnɔ)
- 22: Gannigin bàraru (Gannigin bàra)
- 23: Bake Sika ka sɛm sɔm kowobu (Sɛm sɔmaa)
- 24: À n tii kĩ, a tii nɔɔri (Tii nɔɔribu)
- 25: Saaton gɔɔ (Saaton gɔɔ)

Chaque lecon avec texte complet + 5 sections interactives (observe/ecoute/reagis/retiens/sɔmaa)

**Lecons calcul 26-30** (pages 122-132) :
- 26: À n dò mɔrun gaari koo yeru
- 27: Sunɔ Kom diru
- 28: Gominan gobi bɔkuraru
- 29: Gaatan dii kpɛɛrun yãa dwebu
- 30: Su ka tii yinan yigbɛru

Avec exercices interactifs correspondants dans `CALCUL_N2_EXERCISES`

Ajouter evaluations manquantes pour Part 2 langue (Yaayasiabu nnɛse p.58, nɔɔbuse p.70)

### 2. `src/pages/fitila/FitilaClasse.tsx` — Restructurer les modules N2

- Supprimer le module Alphabet du `sectionCards` quand `activeLevel === 'N2'`
- Remplacer le module unique "Lecons" par deux modules :
  - **Part 1 — Garibu ka yora** (section `'n2-langue'`) : 25 lecons langue
  - **Part 2 — Dooru ka yarumani dendibu** (section `'n2-calcul'`) : 30 lecons calcul
- Ajouter les types de section correspondants
- Chaque part a sa propre liste de lecons et evaluations
- Les composants existants (ClasseLessonView, ClasseCalculView, ClasseEvaluation) sont reutilises avec le bon jeu de donnees

### 3. Aucun changement au `ClasseFacilitateur.tsx`

Le contenu N2 du facilitateur est deja en place.

## Interactivite

Tous les champs texte utilisent automatiquement `BaribaSmartTextarea` (clavier Bariba, suggestions predictives, ecriture manuscrite) — deja integre dans les composants partages.

## Fichiers modifies

| Action | Fichier |
|--------|---------|
| Modifier | `src/data/classeContentN2.ts` — Ajouter 7 lecons langue + 5 lecons calcul + exercices + evaluations |
| Modifier | `src/pages/fitila/FitilaClasse.tsx` — Supprimer Alphabet N2, separer Part 1 et Part 2 |

