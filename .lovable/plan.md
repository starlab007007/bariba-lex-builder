
# Plan de correction: Audio dans le Feed + Affichage Responsive

## Problèmes identifiés

### 1. Pas d'audio dans le feed vidéo publié
**Cause racine:** Dans `VideoFeedCard` (ligne 584 de TamTamSocial.tsx), la balise vidéo a l'attribut `muted` :
```jsx
<video 
  muted  // ← Problème: vidéo muette!
  ...
/>
```

L'audio est bien encodé dans les fichiers MP4 (vérifié dans la base de données: des vidéos de 27-51 secondes existent avec URLs valides), mais le lecteur est configuré pour être silencieux.

**Solution:** 
- Retirer l'attribut `muted` 
- Ajouter un bouton de contrôle du volume (mute/unmute) car les navigateurs modernes bloquent l'autoplay avec son
- Implémenter une logique de "tap to unmute"

### 2. Affichage non-responsive sur mobile/tablette
**Cause racine:** Le composant utilise `h-[100dvh]` mais certains éléments enfants ne s'adaptent pas correctement:
- Pas de gestion explicite des différentes tailles d'écran
- Les marges/paddings sont fixes au lieu de responsives
- L'indicateur de feed central peut chevaucher le contenu sur petits écrans

**Solution:**
- Utiliser des classes responsive Tailwind (sm:, md:, lg:)
- Ajuster les espacements avec des valeurs adaptatives
- Vérifier que `100dvh` fonctionne correctement sur tous les appareils

---

## Modifications techniques

### Fichier: `src/pages/tamtam/TamTamSocial.tsx`

#### 1. VideoFeedCard - Activer l'audio avec contrôle

**Lignes 538-684** - Composant `VideoFeedCard`:

**Changements:**
- Ajouter un état `isMuted` initialisé à `true` (pour respecter les politiques autoplay des navigateurs)
- Retirer l'attribut `muted` statique et le remplacer par `muted={isMuted}`
- Ajouter un bouton de volume (icône speaker) permettant de mute/unmute
- Au premier tap, activer le son

```text
Avant (ligne 584):
muted  ← attribut statique

Après:
muted={isMuted}  ← contrôlable par l'utilisateur
```

**Nouveau bouton volume:**
```text
Position: en haut à droite (symétrie avec les actions en bas à droite)
Style: icône Volume2/VolumeX selon l'état
Comportement: toggle muted/unmuted au tap
```

#### 2. Responsive - Ajustements des espacements

**Modifications sur le conteneur principal (ligne 576):**
```text
Avant:
className="h-[100dvh] w-full ..."

Après:
className="h-[100dvh] w-full min-h-screen ..."
```

**Modifications sur la sidebar d'actions (lignes 637-681):**
```text
Avant:
className="absolute right-3 flex flex-col items-center gap-5"
style={{ bottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 6rem))' }}

Après:
className="absolute right-2 sm:right-3 md:right-4 flex flex-col items-center gap-3 sm:gap-4 md:gap-5"
style={{ bottom: 'max(4.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))' }}
```

**Modifications sur les icônes (tailles adaptatives):**
```text
Avant:
className="w-7 h-7 ..."

Après:
className="w-6 h-6 sm:w-7 sm:h-7 ..."
```

**Modifications sur l'info auteur (lignes 609-634):**
```text
Avant:
style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 5rem))' }}

Après:
style={{ paddingBottom: 'max(3.5rem, calc(env(safe-area-inset-bottom) + 3.5rem))' }}
```

#### 3. FeedIndicator - Responsive

**Modifications sur l'indicateur central (lignes ~200):**
```text
Avant:
className="... px-3 py-1.5 ..."

Après:
className="... px-2 sm:px-3 py-1 sm:py-1.5 ..."
```

**Taille du texte adaptative:**
```text
Avant:
className="text-xs ..."

Après:
className="text-[10px] sm:text-xs ..."
```

---

## Schéma de la solution audio

```text
┌─────────────────────────────────────────────┐
│          🔊 Volume                          │  ← Nouveau bouton (toggle mute)
│                                             │
│                                             │
│           [VIDÉO FULLSCREEN]                │
│           avec audio actif                  │
│                                             │
│                                             │
│  👤 Nom auteur            ❤️ 💬 🔖 ↗️       │
└─────────────────────────────────────────────┘
```

**Comportement du bouton volume:**
1. Premier affichage: vidéo muette (autoplay policy)
2. User tape sur 🔇 → son activé (🔊)
3. État persiste sur les vidéos suivantes
4. Retour visuel avec animation

---

## Résumé des fichiers à modifier

| Fichier | Action |
|---------|--------|
| `src/pages/tamtam/TamTamSocial.tsx` | Ajouter contrôle audio + responsive |

---

## Résultat attendu

Après ces modifications:
- L'audio des vidéos Village Chronicle sera audible dans le feed
- Un bouton de volume permettra de mute/unmute facilement
- L'affichage sera parfaitement adapté à tous les écrans (mobile, tablette, desktop)
- Les éléments UI ne chevaucheront plus sur petits écrans
