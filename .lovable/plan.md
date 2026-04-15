

# Plan : Conversion du Guide d'enseignement N1 en HTML corrigé

## Objectif

Convertir le PDF "Guide d'enseignement N1 Baatonum" (28 pages) en fichier HTML structuré avec application du mapping V2 de correction des caractères Bariba, dans le même format que `Manuel_Bariba_N1_Corrige.html`.

## Contenu du document (28 pages)

Le guide contient :
- Page de titre et table des matières (pages 1-4)
- **Bɔnu gbiika** (Partie 1) : Structure des leçons, planification des 288 séances, répartition par semaine (pages 7-20)
- **Bɔnu yiruse** (Partie 2) : Démarche pédagogique pour langue et calcul (pages 21-27)
- Alphabet Bariba complet (page 25)
- Crédits et auteurs (page 28)

Le texte contient massivement les faux caractères hérités de la police SIL (`ø`, `æ`, `ó`, `á`, `å`, `ä`, `±`, etc.) qu'il faut corriger.

## Étapes

### 1. Extraction du contenu parsé
Récupérer le texte intégral déjà extrait par le parser (1502 lignes de markdown avec tables HTML) et les 48 images extraites.

### 2. Script Python de conversion
- Lire le contenu markdown extrait
- Appliquer le mapping V2 complet (12 substitutions) sur tout le texte
- Normaliser en NFC
- Convertir le markdown en HTML structuré avec CSS (même style que le Manuel corrigé)
- Intégrer les images des pages comme illustrations
- Produire `/mnt/documents/Guide_Enseignement_N1_Corrige.html`

### 3. Mapping appliqué

| Faux | Vrai | Rôle |
|------|------|------|
| `ø` | `ɔ` | Voyelle ouverte |
| `Ø` | `Ɔ` | Majuscule |
| `æ` | `ɛ` | Voyelle ouverte |
| `Æ` | `Ɛ` | Majuscule |
| `ó` | `ɔ̃` | Nasale o ouvert |
| `á` | `ã` | Nasale a |
| `í` | `ĩ` | Nasale i |
| `ä` | `ã` | Variante nasale a |
| `å` | `ɛ̃` | Nasale e ouvert |
| `ö` | `ɔ̀` | o ouvert + ton bas |
| `±` | `ǹ` | n syllabique + ton bas |
| `‹` | `'` | Apostrophe |

### 4. Vérification
Compter les occurrences avant/après pour chaque caractère et afficher un rapport de conversion.

## Sortie

Un fichier HTML autonome téléchargeable : `Guide_Enseignement_N1_Corrige.html`

## Aucun changement au code de l'application
Ce traitement est un script one-off qui produit un document. Aucun fichier du projet ne sera modifié.

