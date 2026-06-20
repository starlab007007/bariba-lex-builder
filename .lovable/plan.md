## Problème

L'erreur `cannot add 'postgres_changes' callbacks for realtime:friendships-realtime after 'subscribe()'` provient de `src/hooks/useTamTamFriends.ts` (et son doublon `bariba-lex-builder/src/hooks/useTamTamFriends.ts`) :

- Le canal porte un **nom constant** (`'friendships-realtime'`) → quand le hook est monté sur plusieurs écrans (drawer Fitila + page Profil + autres), Supabase renvoie l'instance déjà `SUBSCRIBED`, et le second `.on('postgres_changes', …)` lance l'exception.
- Le hook `useTamTamProfile` a déjà été corrigé (Realtime retiré). Il reste à sécuriser **friends** et à appliquer un pattern réutilisable pour éviter la rechute ailleurs.

## Correctifs

### 1. `src/hooks/useTamTamFriends.ts` — canal unique + ordre strict

- Construire le canal **dans le `useEffect`**, avec un nom unique : `` `friendships:${user.id}:${Math.random().toString(36).slice(2)}` ``.
- Enregistrer les deux `.on('postgres_changes', …)` **avant** `.subscribe()` (déjà le cas, à préserver).
- Utiliser un flag `cancelled` local pour ignorer les callbacks tardifs après démontage.
- Nettoyage : `supabase.removeChannel(channel)` systématique dans le `return` du `useEffect`.
- Retirer l'appel `setupRealtime()` séparé : tout reste dans le même `useEffect` pour garantir l'ordre et le cleanup.

### 2. Nouveau helper `src/hooks/useRealtimeChannel.ts` (optionnel mais recommandé)

Petit hook utilitaire qui encapsule le bon pattern (nom unique, ordre `.on()` puis `.subscribe()`, cleanup, flag `cancelled`) pour éviter que d'autres hooks reproduisent l'erreur. Signature :

```ts
useRealtimeChannel(channelKey, [{ event, schema, table, filter, handler }], deps)
```

Utilisé uniquement par les nouveaux abonnements ; les hooks existants ne sont pas réécrits dans ce plan, hormis `useTamTamFriends`.

### 3. Synchroniser le doublon `bariba-lex-builder/src/hooks/useTamTamFriends.ts`

Appliquer la même correction (ou supprimer le doublon s'il n'est pas importé — à vérifier rapidement avant l'édition). Sans cela, un build qui pointe vers ce chemin réintroduit le bug.

### 4. Vérification post-correction

- Charger `/fitila/profile` connecté → plus de bandeau rouge ni de message `after 'subscribe()'` dans la console.
- Naviguer Profil ↔ Drawer ↔ une autre page Fitila plusieurs fois → aucune erreur Realtime, aucun warning de canal déjà abonné.
- Tester en mode hors-ligne → la bannière offline existante s'affiche, pas de crash Realtime.

## Hors périmètre

- Pas de migration SQL ni passage à `realtime.broadcast_changes()` (sera proposé si le volume de notifications devient un problème).
- Pas de réécriture des autres hooks Realtime (ex. notifications) tant qu'ils ne déclenchent pas l'erreur.
