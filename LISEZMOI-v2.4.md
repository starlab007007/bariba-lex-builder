# FITILA Apprendre v2.4 — consolidation adaptative + Voix de référence

Base fonctionnelle : FITILA Android v1.8.7 build18 / branche `feat/apprendre-v2.3-build18-20260927`.

Cette v2.4 fusionne sans régression les deux évolutions appelées « v2.3 » :

- progression adaptative des Scènes de vie (nouvelle / à revoir / réussie, recommandations, tentatives, dernière activité) ;
- circuit complet Voix de référence (écoute, comparaison, Studio Voix, validation, administration, Supabase).

## Compléments v2.4

### Faible connexion / hors-ligne
- le manifeste des voix transporte maintenant `kind`, `pack` et `priority` ;
- trois paquets sont proposés : **Essentiel**, **Scènes**, **Tout** ;
- taille estimée et nombre de voix avant téléchargement ;
- le téléchargement respecte la voix préférée et n'embarque pas inutilement toutes les variantes ;
- possibilité de vider uniquement le cache audio sans toucher au contenu d'apprentissage.

### Comparaison de prononciation
- nouveau paramètre serveur `compare_calibrated` ;
- tant que le pilote vocal n'est pas calibré sur de vraies voix, l'application affiche clairement que les scores sont des repères d'entraînement et non une validation linguistique ;
- l'administration peut marquer le calibrage comme validé après le pilote ;
- contraintes base : `Très proche > Proche` et `MFCC mauvais > MFCC bon`.

### Progression des scènes conservée
- file « À revoir » ;
- recommandation d'une faiblesse avant une nouvelle scène ;
- nombre de tentatives et dernière activité ;
- filtres Toutes / Nouvelles / À revoir / Réussies ;
- rétrocompatibilité avec le stockage local v1.

## Migration supplémentaire

Appliquer après les deux migrations Voix du lot joint :

`supabase/migrations/20260927120000_apprendre_voice_v24.sql`

Elle ajoute le statut de calibrage, enrichit la vue publique des voix et ajoute les index nécessaires aux packs hors-ligne.

## Validation effectuée dans ce lot

- fusion du patch adaptatif sur le lot Voix : sans conflit ;
- `git diff --check` : OK ;
- JSON Apprendre, Scènes et catalogue audio : parsables ;
- le script `tool/scenes_v2/validate.py` nécessite le fichier source `dictionnaire_bariba_fr.json`, qui n'est pas inclus dans l'archive fournie. Sur le dépôt complet, ce contrôle doit être relancé en CI ;
- un test Dart supplémentaire vérifie la persistance du statut de calibrage.

## Étape de build recommandée

Sur le dépôt complet :

```bash
flutter analyze lib/apprendre test/apprendre_module_test.dart
flutter test test/apprendre_module_test.dart
flutter build apk --release --obfuscate --split-debug-info=build/symbols
```

Pour une livraison, monter la version en **1.8.8+19** afin de distinguer clairement cette consolidation de la build18.
