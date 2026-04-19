

L'utilisateur veut une optimisation globale de la plateforme :
1. Performance (ultra rapide)
2. Responsive design (adaptation à toutes tailles d'écrans)
3. Lisibilité claire des modules récents (Classe, Voice Lab, Fitila Tem IA)
4. Tous les autres modules

Je vais explorer rapidement la structure pour bien cibler.
<lov-plan>

# Plan : Optimisation globale de la plateforme FITILA

## Diagnostic en 4 axes

### A. Performance (chargement & runtime)

**Problèmes typiques à corriger** :
- Bundle initial trop lourd : tous les modules (Classe, VoiceLab, IA, Translator, Dictionary…) chargés en une fois
- Images non optimisées et non lazy-loadées
- Re-renders inutiles dans le feed social et Voice Lab
- AudioContext de Voice Lab parfois non libéré

**Actions** :
1. **Code-splitting par route** dans `src/App.tsx` : remplacer les imports statiques des pages lourdes par `React.lazy()` + `<Suspense>` avec un fallback skeleton
   - Routes ciblées : `/fitila/voice-lab`, `/fitila/classe`, `/fitila/tem-ia`, `/fitila/ia`, `/fitila/learn`, `/fitila/dictionary`, `/fitila/translator`, `/admin/*`
2. **Optimisation images** : ajouter `loading="lazy"` et `decoding="async"` sur toutes les `<img>` non critiques (avatars feed, cartes leçons, thumbnails)
3. **React Query** : étendre `staleTime: 5min` sur les hooks de listes statiques (catégories, leçons, dictionnaire) pour éviter les re-fetch
4. **Mémoïsation** : `useMemo`/`useCallback` sur les listes filtrées du Voice Lab et du dictionnaire
5. **Build Vite** : activer `manualChunks` pour séparer `react-vendor`, `supabase`, `framer-motion`, `lucide`

### B. Responsive design (mobile → desktop)

**Constat** : la plateforme est mobile-first mais sur tablette/desktop (>768px) le contenu reste collé en colonne étroite ou s'étire mal.

**Actions** :
1. **Conteneurs adaptatifs** : appliquer `max-w-md md:max-w-2xl lg:max-w-4xl mx-auto` sur les pages de contenu (pas sur le feed social qui doit rester étroit)
2. **Grilles responsive** :
   - Voice Lab catégories : `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
   - Classe (leçons) : `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
   - Dictionary : layout 2 colonnes ≥ md (liste à gauche, détail à droite)
3. **Typographie fluide** : `text-base md:text-lg` sur titres, `text-sm md:text-base` sur corps de texte
4. **Bottom-nav → Side-nav sur desktop** ≥ lg si pertinent (optionnel, à confirmer)
5. **Spacing** : `p-4 md:p-6 lg:p-8` cohérent

### C. Lisibilité & visibilité des nouveaux modules

**Voice Lab, Classe, Fitila Tem IA** : aujourd'hui dans la grille `toolsItems` du drawer mais visuellement noyés.

**Actions** :
1. **Section "Nouveau" en tête du drawer** avec badges "✨ NEW" sur Voice Lab, Classe, Tem IA
2. **Tuile d'accueil dédiée** sur `/fitila/social` (carte horizontale en haut du feed) qui présente les 3 nouveaux outils avec CTA direct
3. **Contraste & tailles** :
   - Augmenter taille emojis tuiles outils : `text-3xl → text-4xl`
   - Labels en `font-bold text-base` au lieu de `font-semibold text-sm`
   - Description visible en 2 lignes au lieu de tronquée
4. **Header propre** sur les 3 modules avec hero gradient + titre FR/BA + emoji XL

### D. Cohérence UX globale

1. **Skeleton loaders** unifiés (au lieu de spinners) sur toutes les pages async
2. **Toast** système harmonisé (succès vert, erreur rouge, info bleu)
3. **Empty states** illustrés (emoji XL + message + CTA) sur Voice Lab vide, Classe vide, etc.
4. **Transitions de page** : `framer-motion` `fade+slide` léger entre routes (déjà présent partiellement)

## Fichiers modifiés (estimation)

- `src/App.tsx` — `React.lazy` + `<Suspense>` pour ~10 routes lourdes
- `vite.config.ts` — `manualChunks` build optimisé
- `src/pages/fitila/FitilaApp.tsx` — section "Nouveau" + tuiles agrandies dans le drawer
- `src/pages/fitila/FitilaVoiceLab.tsx` — grille responsive + header hero
- `src/pages/fitila/FitilaClasse.tsx` (ou équivalent) — grille responsive + header
- `src/pages/fitila/FitilaTemIA.tsx` — header + responsive
- `src/pages/fitila/FitilaSocial.tsx` — bandeau "Découvrez nos nouveaux outils"
- `src/components/ui/skeleton.tsx` (utilisation) — appliqué dans loaders pages
- `src/components/tamtam/KuaishouLayout.tsx` — `max-w` adaptatif
- ~5-8 composants de listes — `loading="lazy"` images + memoïsation

## Garanties

- **Pas de régression** : on ne change pas la logique métier, uniquement layout, lazy-loading et mémoïsation
- **Mobile reste prioritaire** : tous les changements sont additifs (`md:` / `lg:` ne touchent pas le mobile)
- **Bundle initial allégé** : objectif ~30-50% de réduction du JS initial (mesurable via build size)
- **Visibilité immédiate** des nouveaux modules dès l'arrivée sur l'app

## Hors-scope (à demander si besoin)

- Refonte visuelle complète d'un module (juste lisibilité ici)
- PWA/Capacitor (déjà configuré)
- Optimisation backend / RLS / index DB (peut être un 2e passage)

