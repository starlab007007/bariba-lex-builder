
# Optimisation de l'affichage des photos et videos dans la galerie

## Analyse des problemes actuels

### Performance
1. **Videos avec `preload="auto"` dans AnimeLibraryGrid** : charge le contenu complet de TOUTES les videos visibles simultanement -- tres lourd en memoire et bande passante
2. **AssetGridItem** : les videos utilisent `preload="none"` (bien), mais aucun placeholder/skeleton n'est affiche pendant le chargement de l'image poster
3. **Pas de lazy loading pour les videos** : toutes les balises `<video>` sont montees dans le DOM meme hors de l'ecran visible
4. **Images sans dimensions explicites** : cause du layout shift (CLS) lors du chargement
5. **Animation `motion.button` avec `layout`** dans AssetGridItem : le recalcul du layout Framer Motion sur chaque item de grille est couteux quand il y a 20+ elements

### Qualite visuelle
1. **Pas de placeholder blur/skeleton** pendant le chargement des images -- l'utilisateur voit un espace vide
2. **Pas de transition d'apparition** sur les images une fois chargees
3. **Videos sans poster dans AnimeLibraryGrid** : quand `thumbSrc` est null et que le video n'a pas de poster, on voit un rectangle noir
4. **Hover scale (105%)** dans AnimeLibraryGrid applique directement sans optimisation GPU (`will-change`)

## Modifications prevues

### 1. AssetGridItem.tsx -- Chargement optimise avec placeholder

- Ajouter un etat `imageLoaded` pour afficher un skeleton/placeholder anime jusqu'au chargement complet
- Ajouter une transition CSS fade-in quand l'image se charge (`opacity 0 -> 1`)
- Utiliser `IntersectionObserver` pour le lazy loading des videos : ne monter le `<video>` que quand l'element est visible dans le viewport
- Retirer `layout` de `motion.button` (trop couteux) et garder seulement les animations `initial/animate/exit`
- Ajouter `will-change: transform` sur le hover pour activer l'acceleration GPU

### 2. AnimeLibraryGrid.tsx -- Performance video drastique

- Changer `preload="auto"` en `preload="none"` -- les videos ne doivent PAS se precharger dans une grille
- Ajouter un composant interne `LazyVideo` qui utilise `IntersectionObserver` pour ne charger la video que quand elle est visible
- Generer un poster frame de secours : si pas de `thumbSrc`, afficher un skeleton avec une icone Film au lieu d'un rectangle noir
- Ajouter `will-change: transform` pour le hover scale
- Limiter le nombre de videos jouant simultanement a 2 max (pause les autres quand une nouvelle demarre)

### 3. AssetExpandedDrawer.tsx -- Virtualisation legere

- La grille du drawer peut contenir 50+ elements : ajouter un batch rendering progressif (charger les 12 premiers, puis les suivants par groupes de 12 au scroll)
- Appliquer le meme lazy loading video via IntersectionObserver

### 4. AssetGallery.tsx -- Micro-optimisations

- Ajouter des `key` stables sur les composants pour eviter les re-renders inutiles lors du changement de filtres
- Transition fluide entre les changements de categorie avec un fade-out/fade-in au lieu d'un remplacement instantane

## Details techniques

### LazyVideo (nouveau pattern partage)

```text
Composant interne utilisant IntersectionObserver :
1. Rendu initial : skeleton avec icone Play
2. Quand visible (threshold 0.1) : monter le <video> avec preload="metadata"
3. Au hover : play()
4. Quand hors viewport : pause + detruire le src pour liberer la memoire
```

### Image fade-in pattern

```text
const [loaded, setLoaded] = useState(false);

<div className="relative">
  {!loaded && <Skeleton className="absolute inset-0" />}
  <img
    onLoad={() => setLoaded(true)}
    className={cn("transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
  />
</div>
```

### Batch rendering pour le drawer

```text
const [visibleCount, setVisibleCount] = useState(12);
const sentinelRef = useRef(null);

// IntersectionObserver sur le sentinel element en bas de grille
// Quand visible -> setVisibleCount(prev => prev + 12)

{assets.slice(0, visibleCount).map(asset => <AssetGridItem ... />)}
<div ref={sentinelRef} /> // sentinel
```

### Fichiers modifies

1. `src/components/griot-studio/gallery/AssetGridItem.tsx` : placeholder, fade-in, lazy video, retirer layout animation
2. `src/components/admin/AnimeLibraryGrid.tsx` : preload="none", LazyVideo, poster fallback, limite de lectures simultanees
3. `src/components/griot-studio/gallery/AssetExpandedDrawer.tsx` : batch rendering progressif
4. `src/components/griot-studio/AssetGallery.tsx` : transition fluide entre filtres
