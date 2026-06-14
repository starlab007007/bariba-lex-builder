## Objectif

Diagnostiquer la plateforme, corriger les bugs visibles surtout sur **profil + connexion + déconnexion**, et rendre la page profil fluide.

## Diagnostic (constats faits dans le code)

### 1. Connexion (`TamTamPhoneAuth.tsx`)
- `useEffect` redirige vers `/fitila/social` dès que `user` existe → si on arrive sur `/fitila/auth` après un logout incomplet, on est ramené tout de suite (boucle).
- Après login PIN, on fait `supabase.auth.getUser()` une 2ᵉ fois pour `security_answers` → délai inutile, écran figé sur "Connexion...".
- `pin-login` : si `signInWithPassword` échoue, on vide juste `pin` mais l'input caché ne reprend pas le focus → on doit recliquer.
- `handlePhoneSubmit` : si la requête `tamtam_profiles` échoue (réseau), on bascule en mode "nouveau" → bug : un utilisateur existant peut recréer un compte.

### 2. Déconnexion (`AuthContext.signOut` + `TamTamProfile.handleLogout`)
- `signOut()` ne propage pas d'erreur, et `handleLogout` redirige toujours vers `/fitila/auth` même si la session locale est restée → l'auto-redirect côté Auth renvoie sur `/fitila/social`.
- Aucun `await` sur la mise à jour de l'état admin → `isAdmin` peut rester `true` brièvement.
- `localStorage` Supabase pas nettoyé pour les caches custom (profil, follows) → infos persistent visuellement après logout.

### 3. Page Profil (`TamTamProfile.tsx`)
- Trop d'animations `motion.div` parallèles (badges, stats, stories) → jank sur mobile.
- `vocalStats` recalculé à chaque render (pas de `useMemo`).
- `followersForBroadcast` recalculé à chaque render.
- Avatar preview modal fixe en `z-50` mais le scroll de fond n'est pas verrouillé → scroll fantôme.
- `pb-40` sur le scroll wrapper crée une grosse zone vide en bas → look "page cassée".
- `useTamTamProfile` ne s'abonne pas aux changements realtime → après edit, on affiche les anciennes valeurs jusqu'à refetch manuel.
- `ProfileEditModal` n'est pas démonté entre ouvertures → état résiduel.
- Boutons "Paramètres" (notifications, langue, aide) → ne font qu'un toast vocal, pas d'action réelle → utilisateur pense que c'est cassé.

### 4. Routing / garde
- `ProtectedRoute` redirige vers `/fitila/auth` mais après login on va vers `/fitila/social` (jamais vers la page demandée). Pas de `redirect` param respecté.

## Corrections

### Auth & contexte
1. `AuthContext.signOut` : 
   - `await supabase.auth.signOut({ scope: 'local' })` puis reset explicite `setUser(null)`, `setSession(null)`, `setIsAdmin(false)`.
   - Retourner `{ error }` pour que l'appelant sache.
   - Nettoyer les caches React Query éventuels (si présents) + clés `tamtam:*` du localStorage.
2. `TamTamPhoneAuth` :
   - Ne rediriger via `useEffect` que si `step === 'phone'` (sinon laisse finir le flow).
   - Sur erreur PIN : `pin=''` + `pinInputRef.current?.focus()`.
   - Sur erreur réseau dans `handlePhoneSubmit` : toast d'erreur + rester sur `phone` (ne pas basculer en `name`).
   - Supprimer le second `getUser()` post-login : utiliser directement la session.
3. `ProtectedRoute` : passer `?redirect=<from>` et le respecter après login.

### Page Profil — fluidité
4. `useMemo` pour `vocalStats`, `followersForBroadcast`, `myStories`.
5. Réduire les animations : un seul `motion.div` parent avec `staggerChildren`, pas un par carte.
6. Remplacer `pb-40` par `pb-24` et laisser le layout calculer la hauteur (`h-[100dvh]` + `flex-1`).
7. Verrouiller `body { overflow: hidden }` quand un modal plein écran est ouvert (avatar preview, edit, viewer).
8. `useTamTamProfile` : ajouter un canal realtime `tamtam_profiles` filtré sur `user_id`, mettre à jour le state local après `updateProfile` (déjà fait) + refetch sur reconnect.
9. Démonter `ProfileEditModal` quand fermé (`{showEditProfile && <ProfileEditModal ... />}`).
10. Brancher les 3 boutons paramètres :
    - `notifications` → ouvrir `ProfileEditModal` onglet notifications (ou route existante)
    - `language` → ouvrir le sélecteur `TamTamLanguageContext`
    - `help` → naviguer vers `/fitila/learn` (page d'aide existante)
11. Bouton **Déconnexion** : afficher une confirmation simple (dialog) avant `signOut`, puis `navigate('/fitila/auth', { replace: true })` + `window.location.reload()` si la session locale persiste.

### Diagnostic global (rapide)
12. Log centralisé : ajouter `console.warn` propres dans `AuthContext` et `useTamTamProfile` pour tracer login/logout/refetch.
13. Vérifier qu'aucune route protégée n'utilise `navigate()` pendant le render (déjà corrigé dans `TeacherLayout`, vérifier `ProtectedRoute` et `TamTamProfile`).

## Fichiers touchés

```
src/contexts/AuthContext.tsx
src/components/ProtectedRoute.tsx
src/pages/tamtam/TamTamPhoneAuth.tsx
src/pages/tamtam/TamTamProfile.tsx
src/hooks/useTamTamProfile.ts
```

## Hors-scope

- Refonte visuelle complète du profil (on garde le design Kuaishou).
- Refonte des autres modules (dictionnaire, traducteur, classe, etc.) — un audit séparé sera proposé si besoin après ces correctifs.

## Validation

- Login PIN → arrivée directe sur `/fitila/social` sans écran figé.
- Logout depuis Profil → arrivée sur `/fitila/auth`, impossible de revenir en arrière avec session active.
- Refresh sur `/fitila/profile` non connecté → redirigé vers `/fitila/auth`.
- Scroll de la page Profil fluide (pas de jank visible), pas de zone vide en bas.
- Edit profil (avatar/bio/nom) → mise à jour immédiate sans rechargement.
