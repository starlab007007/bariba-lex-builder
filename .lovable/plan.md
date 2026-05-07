
## Problème

`npm ci` échoue car `@capacitor/camera@8.2.0` est dans `package.json` mais absent de `package-lock.json`. Ce fichier lockfile doit être régénéré.

## Solution

1. Exécuter `npm install --legacy-peer-deps` dans le sandbox pour régénérer `package-lock.json` avec toutes les dépendances synchronisées.

C'est tout — une seule commande corrige le problème. Le prochain commit inclura le lockfile mis à jour et le CI passera.
