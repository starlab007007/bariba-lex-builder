
# Masquer Chronicle et supprimer les etapes intermediaires repetitives

## 1. Masquer Village Chronicle de la creation

Le bouton mini-carte "Chronicle" apparait dans l'interface camera (`FullscreenCreator.tsx`, lignes 3732-3753) aux cotes de Griot et Conte. Il faut le supprimer pour ne garder que **Griot** et **Conte**.

**Fichiers concernes :**
- `src/components/tamtam/FullscreenCreator.tsx` : Supprimer le bloc du bouton Village Chronicle (lignes 3732-3753)
- `src/components/tamtam/creator/TemplateSystem/templates/index.ts` : Retirer `villageChronicleTemplate` de `allTemplates`
- `src/components/tamtam/creator/UnifiedTemplateCatalog.tsx` : Retirer `VillageChronicleTemplate` de `PREMIUM_TEMPLATES`

## 2. Supprimer la repetition dans le menu "+" (Patrimoine et Voix du Village)

Actuellement quand on clique sur "+" puis "Patrimoine", cela ouvre `TamTamCreatePost` qui affiche d'abord une etape "category" avec encore "Patrimoine" et "Voix du Village". C'est une repetition inutile.

**Correction :** Passer la categorie deja selectee a `TamTamCreatePost` pour qu'il saute directement a l'etape "templates" (la grille des sous-categories).

**Fichiers concernes :**
- `src/components/tamtam/TamTamCreatePost.tsx` :
  - Ajouter une prop optionnelle `initialCategory?: 'patrimoine' | 'village_voice'`
  - Si `initialCategory` est fourni, demarrer directement a l'etape `templates` avec `mainCategory` pre-rempli
  - Modifier `goBack` pour fermer le modal au lieu de revenir a l'etape `category` quand la categorie etait pre-selectionnee

- `src/pages/tamtam/TamTamSocial.tsx` :
  - Passer `initialCategory={createPostType === 'patrimoine' ? 'patrimoine' : 'village_voice'}` a `TamTamCreatePost`

- `src/pages/tamtam/TamTamHome.tsx` :
  - Meme modification : passer `initialCategory` a `TamTamCreatePost`

## Details techniques

### FullscreenCreator.tsx - Suppression du bouton Chronicle

Supprimer les lignes 3732-3753 (le bloc `motion.button` pour Village Chronicle).

### TamTamCreatePost.tsx - Saut de l'etape category

```text
// Nouvelle prop
interface TamTamCreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: any) => Promise<void>;
  onOpenPoll?: () => void;
  initialCategory?: 'patrimoine' | 'village_voice';  // NOUVEAU
}

// useEffect a l'ouverture
useEffect(() => {
  if (isOpen && initialCategory) {
    setMainCategory(initialCategory);
    setStep('templates');
  }
  if (!isOpen) resetState();
}, [isOpen, initialCategory]);

// goBack modifie
const goBack = () => {
  if (step === 'templates') {
    if (initialCategory) onClose();  // Fermer au lieu de revenir
    else setStep('category');
  } else if (step === 'record') { setStep('templates'); setRecordingTime(0); }
  else if (step === 'preview') { setStep('record'); setPlaybackProgress(0); }
};
```

### TamTamSocial.tsx et TamTamHome.tsx - Passage de la prop

```text
<TamTamCreatePost
  isOpen={showCreatePost}
  onClose={() => setShowCreatePost(false)}
  onSubmit={handleCreatePost}
  initialCategory={createPostType === 'patrimoine' ? 'patrimoine' : 'village_voice'}
/>
```
