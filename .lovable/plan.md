

# Plan : Contenu Classe N2 professionnel, exhaustif et interactif

## Diagnostic de l'existant

Le fichier `classeContentN2.ts` actuel (1468 lignes) contient :
- 25 lecons langue : textes et sections bien remplis
- 5 evaluations : correctes mais basiques
- 30 lecons calcul : **tres sparse** (beaucoup n'ont que 1-2 paragraphes, pas d'exercices)
- Aucune image referencee
- **Contenu manquant du Module N2** : grammaire avancee, production de textes, gestion (decharge, recu, facture, cahier de caisse, fiche de stock, PV)
- **Contenu manquant du Guide N2** : exercices de calcul detailles avec solutions (pages 42-50), tables de correspondance pedagogiques

## Contenu a ajouter (extrait exhaustivement des 3 documents)

### A. Nouveau module : Grammaire N2 (du Module de Formation)
Section interactive avec quiz et exercices pour chaque theme :
- Rappel alphabet (voyelles, consonnes)
- Tons (bas, eleve, nasalisation)
- Classes nominales
- Noms (propre, commun, singulier, pluriel)
- Sujet, Verbe, Pronoms, Adjectifs
- Decomposition des mots (radical, suffixe)
- Temps, mode et formes (affirmative, negative, conditionnelle)

### B. Nouveau module : Production de textes (du Module)
6 types de textes avec definition, caracteristiques, forme et exercice interactif :
1. Lettre familiere (lieu, date, expediteur, destinataire, corps, signature)
2. Lettre administrative (objet, formule de politesse, registre soutenu)
3. Texte narratif (SI, EM/EP, SA, SF)
4. Article de journal (titre, sous-titre, resume, auteur, colonnes)
5. Affiches (titre en capitales, cadre, puces, motivation)
6. Texte descriptif/portrait (adjectifs, imparfait, indicateurs de lieu)

### C. Nouveau module : Gestion (du Module)
Documents de gestion interactifs avec modeles a remplir :
- Decharge (formulaire interactif)
- Recu (modele a completer)
- Facture (Qte x PU = Montant, TVA, Net)
- Cahier de caisse (entrees/sorties/solde)
- Fiche de stock (entree/sortie/reste)
- Proces-verbal de reunion (modele)
- Benefice/Perte (Prix de vente - Prix de revient)

### D. Enrichissement des lecons de calcul (du Guide N2 pages 42-50)
Ajouter les exercices resolus exhaustifs :
- Numeration : 15 001 → 20 002, lecture/ecriture
- Decimaux : 23,45 = yɛnda ita ka wunɔbubuu weeru ka nɔɔbu
- Multiplication decimale : 10 exercices resolus (248x1,25=310 etc.)
- Division decimale : 10 exercices resolus (2134,65:2,1=1016,5 etc.)
- Multiplication mentale : 37x400=14800, 354x70=24780
- Division mentale : 51,84:8=6,48, 57,4:7=8,2
- Exercices mixtes : 10 operations resolues

### E. Images des lecons
Copier les images extraites des PDFs (illustrations de chaque lecon) dans `public/classe/n2/` et les referencer dans les donnees.

## Architecture technique

### Fichiers a creer

| Fichier | Contenu |
|---------|---------|
| `src/data/classeContentN2Grammar.ts` | Grammaire N2 (7 sections, quiz interactifs) |
| `src/data/classeContentN2TextProd.ts` | Production de textes (6 types, exercices) |
| `src/data/classeContentN2Gestion.ts` | Documents de gestion (6 modeles interactifs) |
| `src/components/classe/ClasseGrammaireN2.tsx` | Composant interactif pour la grammaire |
| `src/components/classe/ClasseTextProdN2.tsx` | Composant interactif pour la production de textes |
| `src/components/classe/ClasseGestionN2.tsx` | Composant interactif pour la gestion |

### Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/data/classeContentN2.ts` | Enrichir les 30 lecons calcul avec paragraphes detailles et exercices complets du Guide |
| `src/pages/fitila/FitilaClasse.tsx` | Ajouter 3 modules N2 (Grammaire, Production de textes, Gestion) dans les `sectionCards` et la navigation |

### Structure des modules N2 sur la page d'accueil

```text
N2 Home :
┌──────────────┬────────────────────────┐
│ 📖 Part 1    │ Garibu ka yora (25)    │
├──────────────┼────────────────────────┤
│ 🔢 Part 2    │ Dooru ka yarumani (30) │
├──────────────┼────────────────────────┤
│ 📝 Yaayasia  │ Evaluations (10)       │
├──────────────┼────────────────────────┤
│ 📐 Grammaire │ Classes, tons, verbes  │
├──────────────┼────────────────────────┤
│ ✍️ Sɔm yorubu│ Production de textes   │
├──────────────┼────────────────────────┤
│ 💼 Gobi      │ Gestion (documents)    │
├──────────────┼────────────────────────┤
│ 👨‍🏫 Guide    │ Facilitateur N2        │
└──────────────┴────────────────────────┘
```

### Interactivite des nouveaux composants

**ClasseGrammaireN2** :
- Sections expansibles avec animation
- Quiz a choix multiple pour chaque regle (ex: identifier la classe nominale)
- Exercices de decomposition de mots avec BaribaSmartTextarea
- Tableau interactif des classes nominales avec tri et filtrage
- Code couleur par categorie grammaticale

**ClasseTextProdN2** :
- Modeles visuels de chaque type de texte avec zones colorees
- Exercice interactif : remplir un modele de lettre/article/affiche
- BaribaSmartTextarea pour la redaction libre
- Validation progressive avec feedback visuel

**ClasseGestionN2** :
- Formulaires interactifs pour decharge, recu, facture
- Tableaux editables pour cahier de caisse et fiche de stock
- Calculs automatiques (total, TVA, benefice/perte, solde)
- Exercices pratiques avec scenarios reels

### Enrichissement calcul (`classeContentN2.ts`)

Pour chaque lecon de calcul (1-30), ajouter :
- `paragraphs` complets avec tous les exemples resolus du Guide
- `sections` detaillees (Sɔm gbiikiru, Sɔmburu yiruse, Sɔmburu itase)
- Exercices interactifs dans `CALCUL_N2_EXERCISES` pour les lecons manquantes (6-12, 15-24)
- Tableaux de conversion (mesures, surfaces, volumes) comme donnees structurees

### Images

Copier ~25 illustrations de lecons depuis les PDFs extraits vers `public/classe/n2/` et ajouter `imageUrl` aux lecons correspondantes.

## Contraintes respectees

- Caracteres Bariba Unicode corrects
- Mobile-first, style pastel coherent avec N1
- BaribaSmartTextarea pour tous les champs de saisie
- Progression N2 separee (localStorage)
- Aucun module Alphabet dans N2

