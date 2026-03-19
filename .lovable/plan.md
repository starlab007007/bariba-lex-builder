

## Remplacement du fichier i18n-platform.json

### Ce qui sera fait
Remplacer le fichier `public/i18n-platform.json` existant par le nouveau fichier uploadé `i18n-platform-v2.json` qui contient 2749 lignes de traductions complètes FR ↔ Bariba.

### Étapes
1. Copier `user-uploads://i18n-platform-v2.json` vers `public/i18n-platform.json` (écrasement)
2. Vérifier que le `FitilaLanguageContext` charge correctement le nouveau fichier (structure identique `{ "key": { "fr": "...", "ba": "..." } }`)

### Impact
- Aucune modification de code nécessaire si la structure reste la même
- Les nouvelles clés seront immédiatement disponibles via `t('key')`
- Les clés supprimées dans la nouvelle version ne seront plus résolues (fallback sur le nom de la clé)

