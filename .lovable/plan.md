

# Plan : Creation du contenu Classe Niveau 2 a partir des 3 documents N2

## Objectif

Creer un fichier de donnees `src/data/classeContentN2.ts` contenant toutes les lecons, evaluations et exercices de calcul du Niveau 2, puis integrer le Niveau 2 dans la page Classe existante avec selection de niveau et toutes les fonctionnalites interactives (BaribaSmartTextarea, clavier, predictions, ecriture manuscrite).

## Contenu extrait des documents

### Du Manuel N2 (946 lignes HTML)

**25 lecons de langue** (Bɔnu gbiika : garibu ka yora) — pages 10-70 :
1. Sekura mɔru kɔsa (Barum keu)
2. Àson gberun dĩanu (Dĩa gɔnnun yiibun yasansi)
3. Nim mu ku ra kam mwɛnyɛ (Daa kɔ̃si)
4. Daa kɔ̃saa (Nim)
5. Wurènɛn wãaru (Sida)
6. Dakin yɛnun gɔ̃ɔru (Agbatɛrɛ)
7. Bii wërun seesiabu (Bii wãrun dĩa kobu)
8. Gùdan garaasan sɔɔru (Tem bii geon tirenu)
9. Berun tireru (Gbee wukobu ka kparobun nɔɔsinaa sariru)
10. Sabi Yoon maro daaru (Swaa sanum sariaba)
11. Tamban yɛnun wahalaba (Kɔrɛ kɔrɛ)
12. Baatɔn sikurun sɔɔru (Sikuru)
13. Yãrondo (Yãa dokebu)
14. Kpàraru (Bature keu)
15. Kpaayëron Gɔɔn kpàraru (Bweseru)
16. Dokotoro dirun garin sannɔ (Desantaralisasĩɔ)
17. Gansaaren yiribo duurubu (Dãa duurubun yasansi)
18. Baakon tem dɔrabu (Tem baun sannɔsu)
19-25. Lecons supplementaires de la 2e partie (pages 54-70)

Chaque lecon suit la structure 5 sections :
- I- A mɛɛrio (Observe)
- II- A faagi yeni gario (Ecoute/Lis)
- III- A wunɛn yam waaru geruo (Reagis)
- IV- Yè n weenɛ a n yã (Retiens)
- V- Sɔmaa (Ecris)

**5 evaluations langue** : Yaayasia gbiikibu, yiruse, itase, nnɛse, nɔɔbuse

**25 lecons de calcul** (Dooru ka yarumani dendibu) — pages 73-132 :
1. Tem kãa bɔnun saawaraban tɛtɛ (Dootinun garibu)
2. Bake ka win kpaasibu (Dooti wãsiaruginu)
3. Nɔɔ kusiarun sɔɔru (Sosibu)
4. Bukɔn dɔkɔ (Wĩabu)
5. Dirun wɔru gbebu (Dabiasibu)
...25 lecons au total

**5 evaluations calcul** : Yaayasia gbiikibu a nɔɔbuse

### Du Guide N2 (2024 lignes HTML)

- Planification pedagogique pour chaque lecon
- Table de correspondance sɔm bweseru / gari winu / faagin gari winu / yorin sariaba
- Demarche d'enseignement detaillee
- Distribution horaire (252 kɔbi sur 11 suru)

### Du Module N2 (1548 lignes HTML)

- Grammaire avancee : classes nominales, pronoms, adjectifs, conjugaison
- Production de texte : lettre familiere, lettre administrative, texte narratif, article, affiches, texte descriptif
- Mathematiques : numeration en milliers, nombres decimaux, 4 operations, mesures
- Gestion : benefice, depense, recette, budget

## Architecture technique

### 1. Creer `src/data/classeContentN2.ts`

Meme structure que `classeContent.ts` avec les types existants :
- `CLASSE_N2_LESSONS: ClasseLesson[]` — 25+ lecons langue
- `CLASSE_N2_EVALUATIONS: ClasseEvaluation[]` — 10 evaluations
- `CALCUL_N2_LESSONS: CalculLesson[]` — 25 lecons calcul
- `LESSON_N2_ANSWERS` — reponses aux exercices
- `CALCUL_N2_EXERCISES` — exercices interactifs de calcul
- Fonctions de progression separees avec cle `classe_n2_progress`
- Toutes les donnees extraites exhaustivement des 3 HTML

### 2. Modifier `src/pages/fitila/FitilaClasse.tsx`

- Ajouter un selecteur de niveau actif (N1 / N2) en haut
- Le bouton N2 ne sera plus grise/verrouille
- Le contenu (lecons, evaluations, calcul, facilitateur) change selon le niveau selectionne
- Importer les donnees N2 et les utiliser conditionnellement

### 3. Mettre a jour `src/components/classe/ClasseFacilitateur.tsx`

- Ajouter le contenu pedagogique du Guide N2 et Module N2
- Sections : grammaire avancee, production de textes, demarche pedagogique N2

### 4. Tous les champs texte avec BaribaSmartTextarea

Deja integre dans les composants existants (ClasseLessonView, ClasseEvaluation, ClasseCalculView) — le contenu N2 beneficie automatiquement du clavier Bariba, des suggestions predictives et de l'ecriture manuscrite.

## Fichiers modifies

| Action | Fichier |
|--------|---------|
| Creer | `src/data/classeContentN2.ts` — Tout le contenu N2 (lecons, evaluations, calcul, reponses) |
| Modifier | `src/pages/fitila/FitilaClasse.tsx` — Selecteur de niveau, chargement conditionnel N1/N2 |
| Modifier | `src/components/classe/ClasseFacilitateur.tsx` — Contenu pedagogique N2 |

## Contraintes

- Contenu 100% extrait des 3 documents HTML fournis
- Caracteres Bariba Unicode corrects (deja corriges dans les HTML)
- Meme structure de donnees que N1 pour reutiliser les composants existants
- Progression N2 separee de N1 dans localStorage
- Mobile-first, style pastel coherent

