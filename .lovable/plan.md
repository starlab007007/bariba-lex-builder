

# Plan : Conversion du Module de formation NM Niv 1 en HTML corrigé

## Objectif

Convertir le PDF "Module de formation des facilitateurs du Niveau 1" (31 pages) en fichier HTML structuré avec application du mapping V2 de correction des caractères Bariba — même processus que pour le Guide d'enseignement.

## Contenu du document

Le document est principalement en français (formation des facilitateurs) avec 7 grandes parties :
1. **Langue** — alphabet, tons, nasalisation, classes nominales, conjugaison
2. **Mathématiques/Gestion** — numération, opérations, mesures, monnaie
3. **Étude détaillée du manuel et du guide** — tableaux comparatifs
4. **Démarche d'enseignement/apprentissage** — lecture-écriture et calcul
5. **Préparation des fiches pédagogiques** — modèles de fiches
6. **Exercices de simulation** — pratique en classe
7. **Andragogie** — pédagogie des adultes

Contient des tableaux HTML complexes (planning, fiches, comparatifs) et quelques termes Bariba à corriger.

## Étapes

### 1. Copier le PDF et extraire le contenu
Utiliser le contenu déjà parsé (1601 lignes de markdown + images extraites).

### 2. Script Python de conversion
- Appliquer le mapping V2 Bariba sur tout le texte
- Convertir le markdown en HTML structuré avec CSS (même style que `Manuel_Bariba_N1_Corrige.html` et `Guide_Enseignement_N1_Corrige.html`)
- Intégrer les images de pages comme illustrations base64
- Normaliser en NFC
- Produire `/mnt/documents/Module_Formation_N1_Corrige.html`

### 3. Vérification
Rapport de comptage des caractères convertis.

## Sortie

Fichier HTML autonome téléchargeable : `Module_Formation_N1_Corrige.html`

Aucun fichier du projet ne sera modifié.

