

# Diagnostic et Corrections - Griot Studio

## Bugs critiques identifies

### Bug 1 : Ecran vierge apres publication (CRITIQUE)
Dans `GriotStudio.tsx`, le callback `handlePublishSuccess` (ligne 413) change le step a `'success'`. Cela demonte le composant `PublishStep` car la condition `step === 'finalize'` (ligne 867) devient fausse. Or, a la ligne 899, `step === 'success'` rend `null`. Resultat : ecran vide apres publication.

**Correction** : Ne plus changer le step a `'success'` depuis le parent. Laisser `PublishStep` gerer son propre etat de succes et sa redirection.

### Bug 2 : Aucun indicateur visuel pendant la publication
Dans `PublishStep.tsx`, la variable `isExporting` (ligne 77) est declaree mais jamais mise a `true` dans `handlePublish` (ligne 265). La barre de progression (ligne 473) ne s'affiche donc jamais pendant l'export video. L'utilisateur clique sur "Publier" et ne voit rien se passer.

**Correction** : Ajouter `setIsExporting(true)` avant `exportVideo()` et `setIsExporting(false)` apres, dans `handlePublish`.

### Bug 3 : Scroll bloque - double conteneur scrollable
Dans `GriotStudio.tsx`, le conteneur parent (ligne 489) a `overflow-y-auto` ET le `main` (ligne 561) a aussi `overflow-y-auto`. Deux conteneurs scrollables imbriques creent des conflits : le scroll interne capture les evenements tactiles sur mobile, empechant le defilement visible.

**Correction** : Utiliser `h-[100dvh]` (hauteur fixe) sur le parent SANS `overflow-y-auto`. Seul le `main` (flex-1) gere le scroll avec `overflow-y-auto`.

---

## Plan de corrections

### Fichier 1 : `src/components/griot-studio/GriotStudio.tsx`

1. **Ligne 413-417** : Modifier `handlePublishSuccess` pour ne PAS changer le step. Laisser PublishStep gerer l'etat de succes et la redirection automatique.

2. **Ligne 489** : Changer `min-h-[100dvh] ... overflow-y-auto` en `h-[100dvh] flex flex-col` sans overflow sur le parent. Seul le `main` scrolle.

3. **Ligne 561** : Garder `flex-1 overflow-y-auto overscroll-contain` sur le main — c'est le seul conteneur scrollable.

4. **Ligne 899** : Supprimer le cas `step === 'success'` devenu inutile.

### Fichier 2 : `src/components/griot-studio/PublishStep.tsx`

1. **Ligne 265-296** : Corriger `handlePublish` pour ajouter `setIsExporting(true/false)` autour de `exportVideo()`, donnant un retour visuel pendant l'export.

2. **Ligne 298-306** : Ameliorer la redirection post-publication avec un delai et une animation de progression visible.

3. **Ligne 337** : S'assurer que le conteneur PublishStep a `overflow-y-auto` propre pour que tout le contenu (titre, narration, mode audio, miniature, boutons) soit accessible par scroll.

---

## Resume des corrections

| Bug | Cause | Solution |
|-----|-------|----------|
| Ecran vierge post-publication | `step='success'` demonte PublishStep, `success` rend null | Ne pas changer step, laisser PublishStep gerer |
| Pas d'indicateur de publication | `isExporting` jamais mis a true | Ajouter setIsExporting dans handlePublish |
| Scroll bloque | Double overflow-y-auto imbrique | h-[100dvh] sur parent, overflow uniquement sur main |

