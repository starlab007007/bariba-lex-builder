Diagnostic identifié pour `/fitila/profile` en production

Problème principal
- La page profil plante à cause de l’abonnement temps réel du hook `useTamTamProfile`.
- L’erreur visible indique qu’un callback `postgres_changes` est ajouté sur un canal déjà abonné :
  `cannot add postgres_changes callbacks ... after subscribe()`.
- Le hook `useTamTamProfile()` est utilisé à plusieurs endroits autour de la même route :
  - menu global Fitila (`FitilaApp` / drawer),
  - page profil (`TamTamProfile`),
  - autres écrans Fitila.
- En production, cela peut créer plusieurs abonnements pour le même profil utilisateur, ou réutiliser un canal déjà souscrit, puis faire tomber la route entière via `SafeBoundary`.

Autres signaux observés
- Le backend est sain : base disponible, pool OK, connexions faibles, pas de logs backend récents corrélés à `tamtam_profiles` ou Realtime.
- Les logs navigateur montrent aussi `Failed to fetch` pour les traductions `i18n-platform.json`, ce qui confirme un second problème global de connectivité/cache en production ou WebView.
- La route non connectée redirige correctement vers l’écran d’authentification, donc le crash concerne surtout l’état connecté/profil.

Plan de correction

1. Stabiliser `useTamTamProfile`
- Supprimer ou rendre optionnel l’abonnement temps réel dans `useTamTamProfile`.
- Par défaut, charger le profil via requête simple et mise à jour locale après `updateProfile`.
- Éviter qu’un hook utilisé dans plusieurs composants crée plusieurs canaux Realtime identiques.

2. Empêcher le crash de la route profil
- Transformer les erreurs de profil en état contrôlé (`error`) au lieu de laisser Realtime lancer une exception qui déclenche `SafeBoundary`.
- Afficher un message clair : “Impossible de charger le profil. Vérifiez votre connexion puis réessayez.”
- Garder le bouton `Réessayer` fonctionnel via `refetch`.

3. Réduire les appels réseau inutiles sur `/fitila/profile`
- Éviter que le drawer global charge le profil tant que le menu n’est pas ouvert, ou utiliser un profil déjà chargé.
- Cela réduit les doublons : profil, rôles, notifications, abonnements/friends.

4. Améliorer les erreurs réseau visibles
- Brancher `showErrorToast()` sur les échecs de chargement/mise à jour profil, avatar, bio audio, followers/friends si la route est hors ligne.
- Message attendu : “Pas de connexion Internet — Vérifiez votre réseau puis réessayez.”

5. Corriger le cache i18n production/offline
- Remplacer le fetch `i18n-platform.json?v=Date.now()` par une stratégie compatible PWA/offline.
- Ajouter un fallback local si le fichier ne peut pas être chargé.
- Cela évite des erreurs console inutiles et améliore l’APK hors ligne.

6. Vérification après correction
- Recharger `/fitila/profile` en session connectée.
- Vérifier que le profil s’affiche sans bannière rouge `SafeBoundary`.
- Tester mode hors ligne : bannière globale + toast clair, sans écran cassé.
- Vérifier qu’il n’y a plus d’erreur `cannot add postgres_changes callbacks` dans la console.