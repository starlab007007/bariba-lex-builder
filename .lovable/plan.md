
Objectif
Garantir que quand l’utilisateur choisit “Bariba”, toute l’interface utilise les mots du nouveau fichier joint, et non des libellés codés en dur.

Diagnostic déjà établi (à partir du code + logs)
1) Le fichier JSON est bien chargé côté frontend, mais seulement 676 clés valides sont injectées (log: “[FITILA i18n] Loaded 676 translation keys”).
2) La requête réseau montre bien le contenu récent de /i18n-platform.json (donc le fichier est servi), mais:
   - le contexte ne force pas de refresh anti-cache,
   - et surtout une grande partie de l’UI n’utilise pas t('...').
3) Beaucoup d’écrans affichent des textes Bariba/FR codés en dur via `currentLang === 'ba' ? '...' : '...'` (ex: `src/pages/fitila/FitilaApp.tsx`, menus, boutons, labels, toasts, modals, etc.). Ces textes ne peuvent pas être mis à jour par le nouveau JSON.

Plan de correction (implémentation)
1) Remplacer la source de traduction par le fichier joint
- Copier `user-uploads://i18n-platform.json` vers `public/i18n-platform.json` (écrasement).
- Vérifier qu’il est bien JSON valide UTF-8 (accents/diacritiques Bariba conservés).

2) Rendre le chargement i18n robuste dans `FitilaLanguageContext`
- Charger `/i18n-platform.json?v=<build_or_timestamp>` pour éviter l’ancien cache.
- Ajouter un état `translationsLoaded`.
- Tant que non chargé: fallback sûr (FR) + éviter de figer l’UI avec anciennes valeurs.
- Fallback propre: si clé absente en `ba`, utiliser `fr`; si absente partout, afficher la clé.

3) Migration globale des textes codés en dur vers clés i18n
- Auditer tous les `currentLang === 'ba' ? ... : ...` et libellés statiques FR/BA.
- Remplacer par `t('key')` sur toute l’interface (menu, navigation, cartes, modals, toasts, CTA, badges, états vides, erreurs).
- Priorité immédiate: shell principal `FitilaApp` + pages `/fitila/social`, `/fitila/home`, `/fitila/services`, `/fitila/market`, `/fitila/profile`, composants partagés.
- Conserver uniquement les contenus dynamiques métiers (ex: données utilisateur) hors dictionnaire.

4) Compléter/aligner les clés manquantes
- Pour chaque chaîne migrée, créer/valider la clé correspondante dans `i18n-platform.json`.
- Uniformiser le nommage (`sidebar_*`, `social_*`, `market_*`, etc.) pour éviter doublons.
- Vérifier que chaque clé a bien `fr` et `ba`.

5) Contrôle qualité fonctionnel
- Vérification écran par écran:
  - bascule FR → BA,
  - hard refresh navigateur,
  - navigation complète de la plateforme.
- Vérifier un échantillon de mots “corrigés” demandés (ex: menu/sidebar/social/buttons) contre le nouveau fichier.
- Vérifier qu’aucun ancien mot Bariba ne reste affiché là où une clé i18n existe.

6) Filet de sécurité anti-régression
- Ajouter un script de contrôle (ou checklist CI) qui détecte les chaînes UI hardcodées suspectes:
  - occurrences `currentLang === 'ba' ? '...' : '...'`,
  - libellés FR/BA inline dans composants.
- Objectif: empêcher le retour de traductions hors fichier central.

Résultat attendu
- Le switch langue pilote toute l’UI via `t('key')`.
- Les mots Bariba affichés proviennent du nouveau `public/i18n-platform.json`.
- Les corrections du fichier joint deviennent la source unique de vérité pour la plateforme.

Détail technique (vue rapide)
```text
Choix langue (fr/ba)
      ↓
FitilaLanguageContext (currentLang, t)
      ↓
t('key') lit translations[key][currentLang]
      ↓
JSON central /public/i18n-platform.json (nouvelle version)
      ↓
UI cohérente partout (plus de labels BA codés en dur)
```
