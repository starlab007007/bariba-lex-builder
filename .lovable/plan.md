

# Plan de Production — Auth, Notifications, Performance

## Analyse de l'existant

**Auth** : Le système Phone+PIN (`TamTamPhoneAuth.tsx`) est déjà fonctionnel — inscription par numéro béninois +229, création de PIN 6 chiffres, connexion. MAIS : le bouton "PIN oublié ?" affiche juste un toast "Contactez le support". Il n'y a aucun flux de récupération/réinitialisation de PIN. L'ancien système email/password (`Auth.tsx`) coexiste encore.

**Notifications** : Les hooks `usePushNotifications` et `useExtendedNotifications` existent mais `useExtendedNotifications` n'est **jamais appelé** nulle part dans l'app — les notifications pour réactions, commentaires, follows et demandes d'amitié ne fonctionnent pas.

**Performance** : React Query est configuré (staleTime 5min), lazy loading en place pour toutes les pages. Pas de problème structurel majeur visible.

---

## 1. Récupération de PIN (gratuit, sans service externe)

Puisque les utilisateurs n'ont pas d'email et qu'il faut rester 100% gratuit, la stratégie est une **réinitialisation par vérification d'identité** :

**Flux utilisateur** (simple, pour analphabètes) :
1. L'utilisateur clique "PIN oublié ?" sur l'écran de connexion
2. Il entre son numéro de téléphone (déjà fait à l'étape précédente)
3. Il doit répondre à une question de sécurité : **"Quel nom avez-vous choisi lors de l'inscription ?"**
4. Si le nom correspond → il peut créer un nouveau PIN
5. Si échec → message "Contactez un administrateur"

**Implémentation** :
- Nouvelle edge function `reset-pin` : reçoit `phone_number` + `display_name`, vérifie la correspondance dans `tamtam_profiles`, puis utilise `service_role` pour mettre à jour le mot de passe via `adminClient.auth.admin.updateUserById()`
- Nouvel écran `pin-forgot` dans `TamTamPhoneAuth.tsx` avec le flux question de sécurité + nouveau PIN
- Design identique au reste (fond orange, NumPad, animations)

## 2. Nettoyage Auth — Supprimer l'ancien système email

- Rediriger `/auth` vers `/fitila/auth` (le système Phone+PIN)
- Garder `Auth.tsx` uniquement pour l'accès admin (ou le supprimer si les admins utilisent aussi le Phone+PIN)

## 3. Notifications — Activation complète

- **Appeler `useExtendedNotifications()`** dans `FitilaApp.tsx` (le layout principal) pour que tous les abonnements Realtime soient actifs
- **Demander la permission** au premier lancement via un bouton clair avec icône cloche
- **PWA** : Les notifications Web API fonctionnent déjà en PWA (le code utilise `new Notification()`)
- **Capacitor (Android/iOS)** : Ajouter `@capacitor/push-notifications` dans la config existante et un wrapper conditionnel qui utilise le plugin natif quand disponible, sinon le Web API

## 4. Optimisations Performance pour Production

- **Préchargement** des routes critiques (`social`, `dictionary`, `translator`) via `<link rel="prefetch">`
- **Memo** des composants lourds du feed (déjà partiellement fait avec AudioFeedCard)
- **Images** : Ajouter `loading="lazy"` sur toutes les images du feed
- **Bundle** : Vérifier le tree-shaking des imports lucide-react (importer seulement les icônes utilisées — déjà le cas)

## 5. Checklist Production

- Supprimer les `console.log` de debug restants
- Vérifier que toutes les routes protégées redirigent vers `/fitila/auth`
- S'assurer que la session persiste (Supabase gère déjà la persistence localStorage — l'utilisateur reste connecté jusqu'à déconnexion explicite)
- Valider les RLS policies sur les tables critiques

---

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `supabase/functions/reset-pin/index.ts` | **Créer** — Edge function réinitialisation PIN |
| `src/pages/tamtam/TamTamPhoneAuth.tsx` | **Modifier** — Ajouter flux "PIN oublié" (étapes pin-forgot, pin-reset) |
| `src/pages/fitila/FitilaApp.tsx` | **Modifier** — Activer `useExtendedNotifications()` |
| `src/App.tsx` | **Modifier** — Rediriger `/auth` vers `/fitila/auth` |
| `src/contexts/AuthContext.tsx` | **Conserver** — Le système de session persistante fonctionne déjà |

