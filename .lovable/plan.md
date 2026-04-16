

# Plan : Conversion des 3 documents N2 en HTML corrige avec mapping Bariba V2

## Objectif

Convertir les 3 PDF du Niveau 2 en fichiers HTML autonomes telechargeables, avec application du mapping de correction des caracteres Bariba — meme processus que pour les documents N1.

### Documents a traiter

| Document | Pages | Contenu |
|----------|-------|---------|
| Manuel Bariba N2 | ~52 pages | Manuel de l'apprenant : 30 lecons langue + evaluations + calcul |
| Guide d'enseignement N2 | ~51 pages | Planification, demarche pedagogique, exercices de calcul |
| Module de formation N2 | ~34 pages | Formation des facilitateurs, langue, maths/gestion, andragogie |

### Mapping de correction applique

```text
ø → ɔ    Ø → Ɔ    æ → ɛ    Æ → Ɛ
ó → ɔ̃    á → ã    í → ĩ    ä → ã    å → ɛ̃
ö → ɔ̀    ± → ǹ    ‹ → '
```

## Processus (script Python one-off)

Pour chaque document :

1. Lire le contenu markdown extrait par le parser
2. Convertir les screenshots de pages en images base64 (illustrations)
3. Appliquer le mapping de correction caractere par caractere
4. Convertir le markdown en HTML structure avec CSS integre (meme style que les HTML N1)
5. Normaliser en NFC
6. Afficher un rapport de comptage des caracteres convertis

## Sortie

3 fichiers HTML autonomes :

- `/mnt/documents/Manuel_Bariba_N2_Corrige.html`
- `/mnt/documents/Guide_Enseignement_N2_Corrige.html`
- `/mnt/documents/Module_Formation_N2_Corrige.html`

## Aucun changement au code de l'application

Ce traitement est un script one-off qui produit des documents. Aucun fichier du projet ne sera modifie.

