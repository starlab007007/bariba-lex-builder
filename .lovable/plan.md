

# Plan : Regenerer les 3 HTML N2 avec toutes les images embeddees en base64

## Probleme

Les fichiers HTML N2 actuels font 67-82 KB (texte seul) alors que les N1 font 18-22 MB car ils contiennent les screenshots de chaque page en base64. Les illustrations, photos et schemas des PDF originaux sont absents des HTML.

## Solution

Re-executer le script de conversion en utilisant les images extraites par le parser PDF, embeddees en base64 directement dans le HTML — meme approche que les N1.

## Approche technique

Pour chaque document (Manuel, Guide, Module) :

1. **Collecter les page screenshots** (`page_N.jpg`) et les images inline (`page_N_image_X_v2.jpg`, `img_pN_X.png`) depuis `parsed-documents://`
2. **Copier toutes les images** vers `/tmp/` pour les lire en binaire
3. **Convertir chaque image en base64** et l'injecter dans le HTML :
   - Les page screenshots sont inserees au debut de chaque section `## Page N` comme image pleine largeur
   - Les images inline referees dans le markdown (`![alt](filename)`) sont remplacees par leurs equivalents base64
4. **Appliquer le mapping de correction Bariba** sur tout le texte
5. **Generer les HTML autonomes** avec CSS integre, meme style que les N1

### Images disponibles (extraites des PDFs)

| Document | Page screenshots | Images inline | Total |
|----------|-----------------|---------------|-------|
| Manuel N2 | ~51 pages | ~18 illustrations de lecons | ~69 images |
| Guide N2 | ~51 pages | ~15 tableaux/schemas | ~66 images |
| Module N2 | ~34 pages | ~12 images/tableaux | ~46 images |

## Script Python one-off

Un script `/tmp/rebuild_n2_with_images.py` qui :
- Lit les images depuis `parsed-documents://` (copiees en `/tmp/`)
- Les encode en base64
- Reconstruit le HTML avec le texte corrige + images embeddees
- Produit des fichiers de 15-25 MB chacun (comme les N1)

## Sortie

3 fichiers HTML mis a jour dans `/mnt/documents/` :
- `Manuel_Bariba_N2_Corrige.html` (~20 MB)
- `Guide_Enseignement_N2_Corrige.html` (~20 MB)
- `Module_Formation_N2_Corrige.html` (~15 MB)

## Aucun changement au code de l'application

Script one-off uniquement. Les fichiers HTML existants seront remplaces par les versions completes avec images.

