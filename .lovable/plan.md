# Fix: page blanche sur /fitila/profile en production

## Diagnostic

La route `/fitila/profile` est définie dans `src/App.tsx` (ligne 128) **sans** `ProtectedRoute`, contrairement aux routes `/fitila/teacher`, `/fitila/classe/...`. Trois causes combinées produisent la page blanche :

1. **Race condition d'authentification (cause principale)**
   `TamTamProfile` redirige via `useEffect` dès que `user` est `null`, sans attendre `AuthContext.loading`. Sur un rafraîchissement direct de `/fitila/profile` (cas production), `user` est transitoirement `null` pendant que Supabase restaure la session → la page se vide avant que la session ne revienne, puis reste blanche si la redirection se croise avec le re-render.

2. **Aucun garde quand `profile` est `null`**
   `useTamTamProfile` renvoie `loading=false` puis `profile=null` quand la ligne `tamtam_profiles` n'existe pas (utilisateur créé sans passer par le trigger, ou import). Le composant rend ensuite `KuaishouProfileHeader`, `KuaishouStatsGrid`, etc. avec `profile?.xxx` partout — un sous-composant (par ex. accès à `profile.username` non-optionnel) **crash** → React démonte tout l'arbre → écran blanc (pas d'`ErrorBoundary` autour de la route).

3. **Route non protégée**
   Un visiteur non connecté qui ouvre directement le lien voit aussi une page blanche au lieu d'être redirigé vers `/fitila/auth` proprement.

Les routes dynamiques `/fitila/profile/:userId` fonctionnent car elles utilisent `TamTamPublicProfile` (autre composant, autre logique de chargement basée sur l'`userId` de l'URL — pas de dépendance à la session).

## Correctifs

### 1. Protéger la route
`src/App.tsx` ligne 128 :
```tsx
<Route path="profile" element={<ProtectedRoute><TamTamProfile /></ProtectedRoute>} />
```
Cela élimine la race : `ProtectedRoute` attend déjà `loading` avant de décider.

### 2. Entourer d'un `SafeBoundary`
Toujours dans `App.tsx`, envelopper l'élément :
```tsx
<ProtectedRoute>
  <SafeBoundary label="Profil">
    <TamTamProfile />
  </SafeBoundary>
</ProtectedRoute>
```
Plus jamais d'écran blanc total : le boundary affiche une carte d'erreur + bouton "Réessayer".

### 3. Garde `profile === null` dans `TamTamProfile.tsx`
Après le bloc `if (profileLoading)` (ligne 339), ajouter :
```tsx
if (!profile) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-bold">Profil indisponible</p>
      <p className="text-sm text-muted-foreground">
        Votre profil n'a pas pu être chargé. Réessayez ou reconnectez-vous.
      </p>
      <div className="flex gap-2">
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground">
          Réessayer
        </button>
        <button onClick={async () => { await signOut(); navigate('/fitila/auth', { replace: true }); }} className="px-4 py-2 rounded-xl border">
          Se reconnecter
        </button>
      </div>
    </div>
  );
}
```

### 4. Auto-création de la ligne `tamtam_profiles` si manquante
Dans `useTamTamProfile.fetchProfile`, si `data` est `null` et `user` est l'utilisateur connecté courant, faire un `upsert` minimal :
```ts
if (!data && targetUserId === user?.id) {
  const fallbackUsername = `user_${targetUserId.replace(/-/g,'').slice(0,6)}`;
  const { data: created } = await supabase
    .from('tamtam_profiles')
    .upsert({ user_id: targetUserId, username: fallbackUsername, display_name: 'Utilisateur' }, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();
  setProfile(created as TamTamProfile);
  return;
}
setProfile(data as TamTamProfile);
```
Couvre les comptes créés hors trigger (anciens utilisateurs, imports).

### 5. Ne plus rediriger pendant `auth.loading`
Dans `TamTamProfile.tsx`, remplacer le `useEffect` ligne 130 :
```ts
const { user, loading: authLoading, signOut } = useAuth();
useEffect(() => {
  if (!authLoading && !user) navigate('/fitila/auth', { replace: true });
}, [authLoading, user, navigate]);
```
Filet de sécurité même si ProtectedRoute est retiré plus tard.

## Fichiers modifiés
- `src/App.tsx` — wrap route profil (`ProtectedRoute` + `SafeBoundary`)
- `src/pages/tamtam/TamTamProfile.tsx` — guard `!profile`, respect `authLoading`
- `src/hooks/useTamTamProfile.ts` — upsert auto si profil manquant

## Validation
- Test direct `/fitila/profile` non connecté → redirection `/fitila/auth?redirect=...`
- Test rafraîchissement `/fitila/profile` connecté → spinner puis profil (plus de blanc)
- Test compte sans ligne `tamtam_profiles` → ligne créée à la volée, profil affiché
- Vérifier console : plus d'erreurs `Cannot read properties of null`
