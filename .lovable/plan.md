

# Optimisation camera + bouton flip + flash torche

## Modifications sur `src/components/tamtam/FullscreenCreator.tsx`

### 1. Optimisation du demarrage camera (startStream)

Actuellement la camera demande directement 1920x1080, ce qui est lent sur mobile. On va utiliser un demarrage en deux etapes :

- **Etape 1** : Demander un flux basse resolution (640x480) pour affichage quasi instantane
- **Etape 2** : Une fois le premier frame affiche, upgrader en arriere-plan vers HD (1920x1080)
- Supprimer les `console.log` verbeux pour reduire le bruit

### 2. Bouton flip camera (front/arriere)

Un bouton flip camera est deja present (ligne ~3040) dans le top bar. Il sera ameliore :

- Icone `RotateCcw` dans un cercle glassmorphism visible
- Toggle entre `"user"` (selfie) et `"environment"` (arriere, par defaut)
- Le mode par defaut reste `"environment"` (camera arriere)

### 3. Flash = Torche pour camera arriere

Le bouton Flash (ligne ~3066-3071) est actuellement un simple toggle `flashSim` qui fait un ecran blanc. Il sera modifie :

- **Camera arriere** (`facing === "environment"`) : activer la torche materielle via `videoTrack.applyConstraints({ advanced: [{ torch: true }] })`
- **Camera selfie** (`facing === "user"`) : garder le flash ecran blanc actuel (`flashSim`)
- L'icone Zap changera de couleur quand la torche est active

### Details techniques

**A. startStream optimise** (lignes 717-756)

```text
Etape 1: getUserMedia({ video: { facingMode, width: 640, height: 480 }, audio })
  -> Afficher immediatement
Etape 2: getUserMedia({ video: { facingMode, width: 1920, height: 1080 }, audio })
  -> Remplacer le flux une fois pret
```

**B. Flash handler** (ligne 3070)

Remplacer `onClick={() => setFlashSim((v) => !v)}` par une fonction qui :
1. Verifie `facing`
2. Si `"environment"` : accede au videoTrack du stream, appelle `applyConstraints({ advanced: [{ torch: !torchActive }] })`, met a jour un state `torchActive`
3. Si `"user"` : toggle `flashSim` comme avant

**C. Nouveau state**

Ajouter `const [torchActive, setTorchActive] = useState(false)` pour suivre l'etat de la torche materielle. Reinitialiser a `false` quand on change de camera.

