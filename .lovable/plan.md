

## Plan: Fichier complet de traduction i18n de toute la plateforme

### Constat actuel

1. **`public/i18n-platform.json`** existe avec ~350 clés `{ fr, ba }` mais **n'est utilisé par aucun composant** — il n'est jamais importé.
2. **`FitilaLanguageContext.tsx`** contient un dictionnaire inline de ~220 clés, utilisé via `t('key')` par 64+ composants.
3. **~55 fichiers composants** contiennent des textes français hardcodés (boutons, placeholders, messages toast, titres) qui ne passent pas par `t()`.

### Ce que je vais faire

**Fusionner et compléter `public/i18n-platform.json`** pour en faire LE fichier de référence unique contenant TOUS les textes traduisibles de la plateforme, organisé par module :

- **Navigation & Sidebar** (accueil, profil, outils, admin...)
- **Social / Feed** (fil, messages, groupes, live, réactions, commentaires...)
- **Conte Vivant & Griot** (scènes, narration, branches, auto-illustrer...)
- **Traducteur** (modes voix/texte/photo/doc, historique...)
- **Dictionnaire** (recherche, modes vocal/clavier...)
- **Apprentissage** (leçons, quiz, badges, niveaux, scores...)
- **Marché** (boutique, emplois, produits, candidatures...)
- **Services IA** (santé, finance, agriculture, météo...)
- **SOS / Urgence** (alertes, contacts, localisation...)
- **Profil** (bio, stats, publications, paramètres...)
- **Authentification** (connexion, inscription, OTP...)
- **Radio** (diffusion, vitesse, source...)
- **Création de contenu** (éditeur, templates, effets, transcription...)
- **Messages communs** (erreur, succès, chargement, annuler, confirmer...)

Le fichier contiendra **toutes les clés existantes** (du context + du json actuel) plus **toutes les chaînes hardcodées trouvées** dans les composants. Chaque entrée aura le format :

```json
"cle_unique": { "fr": "Texte français", "ba": "" }
```

Les traductions Bariba déjà connues seront pré-remplies. Les nouvelles clés auront `"ba": ""` vide pour que vous puissiez les traduire manuellement.

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `public/i18n-platform.json` | Compléter avec TOUS les textes manquants, organisé par sections |

Ce fichier sera ensuite votre document de référence : vous traduisez chaque `"ba": ""` en bariba, et une fois chargé dans le système, toute la plateforme sera en bariba.

### Ce que le plan ne fait PAS (pour une prochaine étape)
- Modifier `FitilaLanguageContext.tsx` pour charger `i18n-platform.json` au lieu du dict inline
- Remplacer les strings hardcodées dans les 55+ composants par des appels `t('cle')`

Ces étapes seront nécessaires après que vous aurez traduit le fichier.

