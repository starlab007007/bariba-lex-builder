
# Plan: Correction de l'Erreur de Connexion

## Diagnostic

L'erreur "Connection Error - Please check your internet connection" apparaît parce que :

1. **`OfflineService.ts` fait un ping vers `/robots.txt`** qui peut retourner 404
2. **Quand `response.ok` est `false`**, l'app passe en mode "offline"
3. **Supabase client** affiche ce message en anglais quand les requêtes échouent

## Solution

### Fichier à modifier : `src/services/OfflineService.ts`

**Problème actuel (ligne 54):**
```typescript
this._isOnline = response.ok; // Problème: 404 = offline!
```

**Correction proposée:**
- Accepter les réponses 200-299 ET 404 comme "en ligne" (404 signifie que le serveur répond)
- Ajouter un fallback vers un endpoint Supabase pour vérifier la vraie connectivité
- Ne déclarer "offline" que si le fetch lance une exception réseau

### Changements techniques

1. **Améliorer la logique de vérification:**
   - Réponse reçue (même 404) = en ligne
   - Exception `fetch` = vérifier `navigator.onLine`

2. **Ajouter un endpoint de secours:**
   - Si `/robots.txt` échoue, tester la connectivité Supabase
   - Utiliser `HEAD` request vers l'URL Supabase

3. **Supprimer le toast automatique:**
   - L'app ne doit pas afficher d'erreur si on est réellement en ligne

## Résultat attendu

- Plus de faux positifs "Connection Error"
- Détection précise du vrai état offline
- Messages en français cohérents avec le reste de l'app
