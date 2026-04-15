

# Plan : Correction de l'encodage Bariba du Manuel HTML

## Objectif

Appliquer le mapping de conversion V2 sur l'intégralité du fichier HTML (3269 lignes, 124 pages) pour remplacer les faux caractères hérités de l'ancienne police SIL par les vrais caractères Unicode Bariba.

## Mapping de conversion

| Faux caractère | Vrai Unicode | Rôle |
|---|---|---|
| `ø` | `ɔ` | Voyelle ouverte |
| `Ø` | `Ɔ` | Majuscule |
| `æ` | `ɛ` | Voyelle ouverte |
| `Æ` | `Ɛ` | Majuscule |
| `ó` | `ɔ̃` | Nasale o ouvert |
| `á` | `ã` | Nasale a |
| `í` | `ĩ` | Nasale i |
| `ä` | `ã` | Nasale a (variante) |
| `å` | `ɛ̃` | Nasale e ouvert |
| `ö` | `ɔ̀` | o ouvert + ton bas |
| `±` | `ǹ` | n syllabique + ton bas |
| `‹` | `'` | Apostrophe |

## Étapes

### 1. Copier le fichier HTML vers `/tmp/`
Copier `user-uploads://Manuel_Bariba_N1_Numerique.html` vers `/tmp/input.html`.

### 2. Exécuter le script Python de conversion
Script Python qui :
- Lit le HTML complet
- Applique les 12 substitutions dans l'ordre correct (les multi-caractères d'abord pour éviter les conflits)
- Normalise en NFC
- **Protège les balises HTML et CSS** : ne remplace que dans le contenu textuel visible (pas dans les attributs `class`, `style`, URLs, etc.)
- Écrit le résultat dans `/mnt/documents/Manuel_Bariba_N1_Corrige.html`

### 3. Vérification rapide
Compter les occurrences avant/après pour chaque caractère converti et afficher un rapport.

## Précautions
- L'ordre des substitutions est critique : `ó` avant `ø` (sinon `ó` serait partiellement converti)
- Les attributs HTML contenant `ø` ou `æ` (comme le placeholder `søøsi`) doivent aussi être corrigés car ce sont des termes Bariba visibles
- Le titre `BENÆ TEM` → `BENƐ TEM`, le titre `BENɚ TEM` reste tel quel (déjà en Unicode)
- Normalisation NFC finale pour assembler correctement les diacritiques combinés

## Sortie
Un fichier HTML corrigé téléchargeable : `Manuel_Bariba_N1_Corrige.html`

