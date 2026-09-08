# Audit Fitila — dev + production, et corrections

## Ce que l'audit a montré

Vérifications faites maintenant :

- Le site de production répond correctement : la page `/fitila/profile` renvoie bien la page (200), le fichier principal de l'application, le manifeste, les icônes et les morceaux chargés à la demande sont tous servis (200). Les clés de connexion au backend sont bien présentes dans la version publiée.
- Le contrôle des types de tout le code ne remonte aucune erreur.
- Le serveur de développement démarre sans erreur.

Donc la production n'est pas cassée au niveau du serveur. Les pannes constatées par les utilisateurs (écran blanc, bandeau rouge « une erreur est survenue ») viennent du code de l'application. L'audit a trouvé trois causes réelles et une source de confusion.

### 1. Abonnements temps réel jamais nettoyés (cause n°1 des écrans rouges/blancs)

Dans `src/hooks/useTamTamRealtime.ts` (messages, salons live) et `src/hooks/useTamTamNotifications.ts`, l'abonnement est créé dans une fonction dont le « nettoyage » n'est jamais renvoyé à React. Résultat : à chaque changement d'écran, un nouvel abonnement s'ajoute sans que l'ancien soit fermé. Quand un abonnement portant le même nom est réutilisé, le backend renvoie l'erreur `cannot add postgres_changes callbacks ... after subscribe()` — exactement l'erreur observée sur la page profil.

### 2. Noms d'abonnement fixes partagés (même famille de panne, ~20 endroits)

Une vingtaine de fichiers utilisent un nom fixe (`notifications-realtime`, `voice-rooms`, `polls-changes`, `nav-unread-messages`, `reaction-notifications`, `comment-notifications`, `follow-notifications`, `friend-notifications`, `adaptive-feed-realtime`, `videos-feed-realtime`, `asset_stats_updates`, `quick_stats`, `asset_imports_changes`, `push-notifications`, `live-rooms`, `messages-<id>`…). Dès que deux écrans montent le même hook, ou lors d'un remontage rapide, la même collision se reproduit. Seuls `useTamTamFriends` et `useTamTamProfile` ont déjà été corrigés.

### 3. Ancienne version gardée en mémoire par le mode hors-ligne

L'application installe un mécanisme hors-ligne (`sw.js`). Après un nouveau déploiement, un appareil qui garde l'ancienne version en mémoire demande des fichiers qui n'existent plus et affiche un écran blanc (« Failed to fetch dynamically imported module », déjà signalé plusieurs fois). Il manque une mise à jour automatique + un message « nouvelle version disponible ».

### 4. Copie parallèle du projet qui dérive

Le dossier `bariba-lex-builder/` contient une copie ancienne du code (par exemple l'ancienne version buguée de `useTamTamFriends`). Elle n'est pas utilisée par la version publiée, mais elle fausse toute recherche et tout diagnostic, et fait croire à des corrections non appliquées.

## Corrections prévues

1. **Fiabiliser le temps réel partout**
   - Créer un utilitaire unique (`src/lib/realtime.ts`) qui : génère un nom d'abonnement unique par montage, enregistre tous les écouteurs avant de s'abonner, et ferme proprement l'abonnement au démontage.
   - Réécrire `useTamTamRealtime.ts` et `useTamTamNotifications.ts` pour renvoyer réellement le nettoyage à React.
   - Migrer les ~20 autres fichiers listés vers cet utilitaire.
   - Résultat attendu : plus aucune erreur `after subscribe()`, plus de fuite d'abonnements.

2. **Mise à jour propre après déploiement**
   - Activer la mise à jour automatique du mécanisme hors-ligne et afficher un petit bandeau « Nouvelle version disponible — recharger ».
   - Récupérer élégamment l'échec de chargement d'un écran (rechargement automatique une seule fois) au lieu d'un écran blanc.

3. **Filet de sécurité d'affichage**
   - Vérifier que chaque écran principal est bien entouré du garde-fou d'erreur existant, avec un message clair et un bouton « Réessayer » plutôt qu'une page vide.

4. **Nettoyage de la confusion de dossiers**
   - Soit supprimer `bariba-lex-builder/`, soit y appliquer les mêmes correctifs. Recommandation : le supprimer du dépôt, car le déploiement ne l'utilise pas. À valider avec toi avant suppression.

5. **Vérification finale**
   - Parcours automatisé du navigateur sur les écrans sensibles (accueil, profil, social, traducteur, classe, messages) en surveillant la console : zéro erreur temps réel, zéro écran vide.

## Détails techniques

- Nouvel utilitaire : `createRealtimeChannel(name, handlers)` → nom `"<name>:<uid>:<random>"`, chaînage des `.on()` avant `.subscribe()`, retour d'une fonction `cleanup` appelant `supabase.removeChannel`.
- Fichiers touchés (temps réel) : `useTamTamRealtime`, `useTamTamNotifications`, `useExtendedNotifications`, `useVoiceRooms`, `useVideoFeed`, `useTamTamPolls`, `useTamTamLive`, `useAssetStats`, `useAdaptiveFeed`, `usePushNotifications`, `usePrivateVoiceMessages`, `useStoryViews`, `useStoryReactions`, `useRecordingIndicator`, `AssetImportContext`, `TamTamNavigation`, `TamTamCommunityChat`.
- PWA : `registerType: 'autoUpdate'` + `onNeedRefresh` via `virtual:pwa-register`, plus un `window.addEventListener('vite:preloadError', …)` avec rechargement unique protégé par un drapeau en `sessionStorage`.
- `nginx.conf` est déjà correct (index non mis en cache) — aucun changement nécessaire côté serveur.
