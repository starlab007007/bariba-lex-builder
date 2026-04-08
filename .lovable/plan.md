

# Audit de sécurité et corrections complètes — Plan

## Résumé des problèmes identifiés

### A. Erreurs de build (20 erreurs TypeScript bloquantes)

| Fichier | Problème |
|---------|----------|
| `admin-users/index.ts` | `banned_until` n'existe pas sur le type `User` |
| `bariba-stt/index.ts` | `Uint8Array` incompatible avec `BlobPart` |
| `generate-anime-library/index.ts` | Type `SupabaseClient` incompatible (5 erreurs) + insert/select sur type `never` (6 erreurs) |
| `generate-anime-story/index.ts` | Même problème `SupabaseClient` + propriétés `never` (5 erreurs) |
| `generate-template-visuals/index.ts` | Fonction `generateStoryboardFrames` appelée mais jamais définie |
| `generate-video-posters/index.ts` | `error` de type `unknown` |

### B. Problèmes de sécurité restants (scan)

| Issue | Statut |
|-------|--------|
| SECURITY DEFINER bypass | Ignoré (justifié — nécessaire pour RLS) |
| Public data exposure | Ignoré (plateforme sociale — intentionnel) |
| Public storage buckets | Ignoré (nécessaire pour lecture media) |
| Extension pg_net en public | Ignoré (limitation plateforme) |
| **Leaked Password Protection** | **À corriger manuellement** |

---

## Plan de corrections

### Étape 1 — Fix `admin-users/index.ts`
- Caster `u` en `any` pour accéder à `banned_until` (propriété présente au runtime mais pas dans le type SDK)
```typescript
banned: (u as any).banned_until ? true : false,
banned_until: (u as any).banned_until,
```

### Étape 2 — Fix `bariba-stt/index.ts`
- Caster `audioBytes` en `Uint8Array` compatible :
```typescript
const blob = new Blob([audioBytes as unknown as BlobPart], { type: mime });
```

### Étape 3 — Fix `generate-anime-library/index.ts`
- Changer l'import supabase-js de `@2.39.3` vers `@2` (sans version mineure stricte) pour résoudre les incompatibilités de type
- Ajouter des annotations `as any` sur les paramètres supabase des fonctions helper pour éviter les erreurs de type générique
- Caster les résultats `.select()` avec `as any[]` pour les accès aux propriétés

### Étape 4 — Fix `generate-anime-story/index.ts`
- Même correction d'import supabase-js
- Caster les accès aux propriétés `video_url`, `video_duration`, `usage_count` avec `as any`
- Caster le paramètre d'update avec `as any`

### Étape 5 — Fix `generate-template-visuals/index.ts`
- Créer la fonction manquante `generateStoryboardFrames` qui génère des frames de storyboard pour un template (similaire à `generateAnimatedFrames` déjà présente)

### Étape 6 — Fix `generate-video-posters/index.ts`
- Typer le catch : `catch (error: unknown)` et utiliser `(error as Error).message`

### Étape 7 — Sécurité : action manuelle
- Rappeler l'activation du **Password HIBP Check** dans Cloud → Users → Auth Settings → Email

---

## Détails techniques

- **Cause racine** des erreurs `SupabaseClient<any, "public", any>` : les fonctions helper déclarent un type strict `ReturnType<typeof createClient>` mais l'instance est créée avec un client `any`. Solution : utiliser `any` comme type de paramètre.
- **Fonction manquante `generateStoryboardFrames`** : sera implémentée comme wrapper autour de l'API Lovable AI pour générer 4-6 frames descriptives d'un template vidéo.
- Toutes les corrections sont isolées aux edge functions — aucun changement dans le code frontend.

