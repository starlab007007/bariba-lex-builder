

# Corriger la lecture audio dans les feeds Patrimoine et Voix du Village

## Problemes identifies

### 1. Pas d'audio enregistre sur les anciens posts
4 des 6 posts en base ont `audio_url: NULL` (crees avant la correction d'upload). Ces posts ne pourront jamais jouer d'audio. Il faut ameliorer l'experience utilisateur pour ces cas.

### 2. Template matching incorrect
La fonction `getTemplateById` fait une correspondance exacte (`t.id === id`), mais les `template_id` en base sont des sous-categories comme `annonce_reunion`, `proverbe_travail`, `conte_animaux`. Les templates visuels ont des ids simples comme `conte`, `annonce`, `proverbe`. Resultat : tous les posts affichent le template par defaut au lieu du bon visuel.

### 3. Preload audio insuffisant
L'element `<audio>` utilise `preload="metadata"` meme quand la carte est active. Sur mobile, cela peut retarder significativement la lecture car l'audio n'est pas telecharge a l'avance.

### 4. Attribut `loop` empeche la fin de lecture
L'audio a l'attribut `loop`, ce qui empeche l'evenement `onEnded` de se declencher. Le progres ne se reinitialise jamais et l'utilisateur ne sait pas quand l'audio est termine.

### 5. Affichage de duree "0:00"
Quand `audioDuration` est 0 (pas encore charge), l'affichage montre "0:00" au lieu de "--:--" ou un indicateur de chargement.

## Corrections

### Fichier : `src/pages/tamtam/TamTamSocial.tsx`

**A. Corriger `getTemplateById` (ligne 69-73)**
Utiliser `startsWith` au lieu de l'egalite exacte pour matcher les sous-categories :
```text
const getTemplateById = (id, category) => {
  if (!id) return defaultTemplate;
  const found = diskTemplates.find(t => id === t.id || id.startsWith(t.id));
  // aussi chercher par sous-categorie
  if (!found) {
    // Chercher si l'id contient un mot-cle de template
    const byKeyword = diskTemplates.find(t => id.includes(t.id));
    if (byKeyword) return byKeyword;
  }
  return found || (category === 'patrimoine' ? diskTemplates[0] : diskTemplates[3]);
};
```

**B. Supprimer `loop` de l'element audio (ligne 421)**
Retirer l'attribut `loop` pour permettre a `onEnded` de fonctionner correctement et reinitialiser le progres.

**C. Changer `preload` dynamiquement (ligne 421)**
Utiliser `preload="auto"` quand la carte est active pour charger l'audio immediatement, et `preload="none"` sinon :
```text
<audio ref={audioRef} src={post.audio_url} preload={isActive ? "auto" : "none"} />
```

**D. Afficher "--:--" quand la duree est inconnue (ligne 507)**
Remplacer "0:00" par "--:--" quand `audioDuration` est 0 ou pas encore charge :
```text
<span>{audioDuration > 0 ? formatTime(audioDuration) : '--:--'}</span>
```

**E. Ameliorer l'experience pour les posts sans audio (lignes 461-466)**
Desactiver visuellement les boutons play/skip quand `hasAudio` est false. Ajouter une opacite reduite sur les controles.

## Resume

- **1 fichier modifie** : `src/pages/tamtam/TamTamSocial.tsx`
- Les posts avec audio existant joueront correctement (preload auto, pas de loop, duree reelle)
- Les templates visuels correspondront aux vrais types de contenu
- Les posts sans audio auront une UI claire et non-trompeuse

