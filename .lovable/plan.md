
# Plan d'Harmonisation Feed Vidéo Plein Écran Style Kuaishou

## Analyse de la Référence Kuaishou

La capture fournie montre un design très spécifique avec:
- Header ultra-minimaliste avec menu hamburger et recherche
- Vidéo occupant 100% du viewport sans marges
- Sidebar d'actions verticale avec avatar utilisateur + bouton Follow
- Sous-titres colorés superposés directement sur la vidéo
- Zone d'infos en bas avec dégradé prononcé
- Navigation bottom avec fond BLANC (pas noir)

---

## PHASE 1 : Refonte du Header Feed (FeedIndicator)

### Objectif
Transformer le header actuel en style Kuaishou minimaliste

### Modifications
**Fichier**: `src/pages/tamtam/TamTamSocial.tsx` (composant FeedIndicator)

**Changements**:
1. Menu hamburger à GAUCHE (existant mais à styliser)
2. Logo/Marque FITILA au CENTRE (remplacer les dots)
3. Icône RECHERCHE à DROITE
4. Fond TRANSPARENT total
5. Icônes BLANCHES avec ombre légère

**Code cible**:
```text
┌─────────────────────────────────────┐
│  [≡]            🎬 FITILA      [🔍] │
└─────────────────────────────────────┘
```

---

## PHASE 2 : Refonte VideoFeedCard - Layout Kuaishou

### Objectif
Adapter le composant VideoFeedCard pour correspondre exactement au design Kuaishou

### 2.1 Structure de la Sidebar Droite (Actions)

**Position actuelle**: Boutons avec labels en dessous
**Position Kuaishou**: 
- Avatar utilisateur EN HAUT avec bouton Follow (+) rouge
- Ensuite les actions (Like, Comment, Favorite, Share)
- Format: Icône circulaire + compteur en dessous

**Ordre des éléments Kuaishou**:
```text
    ┌─────┐
    │ 👤  │ ← Avatar créateur
    └──┬──┘
       │+│  ← Bouton Follow (rouge)
    ┌─────┐
    │ ❤️  │ ← 10.8k likes
    └─────┘
    ┌─────┐
    │ 💬  │ ← 1.3k comments
    └─────┘
    ┌─────┐
    │ ⭐  │ ← 2.7k favorites
    └─────┘
    ┌─────┐
    │ ➡️  │ ← 2.7k shares
    └─────┘
```

### 2.2 Zone Infos Bas de l'Écran

**Éléments Kuaishou**:
1. @username avec badge vérifié (✓ orange)
2. Description multiligne avec hashtags
3. Lien "Unfold" pour texte long
4. Mini avatar à droite en bas

**Dégradé**: Plus prononcé (70% → transparent)

---

## PHASE 3 : Sous-titres Superposés Style Kuaishou

### Objectif
Afficher les sous-titres directement sur la vidéo comme dans Kuaishou

### Style des sous-titres
- Texte principal en BLANC avec contour
- Texte secondaire en ORANGE/ROUGE pour emphase
- Position: Centre-bas de la vidéo (au-dessus des infos)
- Police: Bold, grande taille
- Ombre portée prononcée

**CSS cible**:
```css
.kuaishou-subtitle {
  font-size: clamp(1.25rem, 5vw, 1.75rem);
  font-weight: 800;
  color: white;
  text-shadow: 
    2px 2px 0 #000,
    -2px -2px 0 #000,
    2px -2px 0 #000,
    -2px 2px 0 #000,
    0 4px 8px rgba(0,0,0,0.8);
}

.kuaishou-subtitle-accent {
  color: #FF5722;
  background: linear-gradient(90deg, #FF5722, #FF7A00);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## PHASE 4 : Bottom Navigation Style Kuaishou

### Objectif
Passer de la nav noire actuelle à une nav BLANCHE style Kuaishou

### Modifications
**Fichier**: `src/pages/tamtam/TamTamSocial.tsx` (composant BottomTabBar)

**Changements**:
1. Fond BLANC (`#FFFFFF`) au lieu de noir
2. Icônes en GRIS foncé (`#1A1A1A`) au lieu de blanc
3. Icône active en NOIR avec indicateur
4. Bouton "+" central avec style Kuaishou (cyan + rouge)
5. Labels: Home, Featured, Message, Me

**Code cible**:
```text
┌─────────────────────────────────────┐
│ [🏠]   [✨]   [+]   [📩]   [👤]   │
│ Home  Featured     Message   Me    │ ← Fond blanc
└─────────────────────────────────────┘
```

---

## PHASE 5 : Tokens CSS Kuaishou Feed

### Fichier: `src/index.css`

**Ajouts**:
```css
/* Kuaishou Feed Tokens */
--kuaishou-feed-bg: #000000;
--kuaishou-nav-bg: #FFFFFF;
--kuaishou-nav-icon: #1A1A1A;
--kuaishou-nav-icon-muted: #999999;
--kuaishou-accent-red: #FF2D55;
--kuaishou-accent-cyan: #00D4FF;
--kuaishou-verified: #FF7A00;

/* Kuaishou Subtitle System */
.kuaishou-video-subtitle {
  position: absolute;
  bottom: 35%;
  left: 50%;
  transform: translateX(-50%);
  max-width: 90%;
  text-align: center;
  z-index: 10;
}
```

---

## PHASE 6 : Avatar avec Follow Button Intégré

### Nouveau composant ou modification inline

**Structure**:
```text
┌──────────┐
│   👤     │ ← Avatar 48px, border blanc
├──────────┤
│    +     │ ← Bouton rouge 20px, chevauchement
└──────────┘
```

**Logique**:
- Avatar cliquable → profil utilisateur
- Bouton "+" → Follow/Unfollow
- Animation au tap (scale + couleur)

---

## Fichiers à Modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/tamtam/TamTamSocial.tsx` | FeedIndicator (header), VideoFeedCard (sidebar + infos), BottomTabBar (fond blanc) |
| `src/index.css` | Tokens Kuaishou feed, classes subtitle, nav blanche |
| `src/components/tamtam/KuaishouBottomNav.tsx` | Harmoniser avec le nouveau style (fond blanc) |

---

## Résultat Attendu

```text
┌─────────────────────────────────────┐
│ [≡]           🎬 FITILA        [🔍] │ ← Header transparent
├─────────────────────────────────────┤
│                                     │
│                                     │
│          [VIDEO PLEIN ÉCRAN]        │
│           object-cover 100%         │
│                                     │
│     ╔═══════════════════════╗       │
│     ║  父母年过九旬还在世   ║       │ ← Sous-titres
│     ║  对子女是福 还是祸    ║       │    superposés
│     ╚═══════════════════════╝       │
│                              ┌────┐ │
│                              │ 👤 │ │ ← Avatar +
│                              │ + │ │    Follow
│                              ├────┤ │
│                              │ ❤️ │ │
│                              │10.8k│ │
│                              ├────┤ │
│                              │ 💬 │ │
│                              │1.3k│ │
│                              ├────┤ │
│                              │ ⭐ │ │
│                              │2.7k│ │
│                              ├────┤ │
│                              │ ➡️ │ │
│                              │2.7k│ │
│                              └────┘ │
│ @董超 ✓                       [👤] │ ← Username vérifié
│ 父母年过九旬还在世，对子女      │    + mini avatar
│ 是福，还是祸？#亲情 #父母恩...  │
│ ...Unfold                          │
├─────────────────────────────────────┤
│ [🏠]   [✨]   [+]   [📩]   [👤]   │ ← Nav blanche
│ Home  Featured     Message   Me    │
└─────────────────────────────────────┘
```

---

## Détails Techniques

### Sidebar Actions - Nouveau Layout
- Position: `right-3` (inchangé)
- Ordre: Avatar → Follow → Like → Comment → Favorite → Share
- Espacement: `gap-5` entre chaque action
- Avatar: 48px avec border blanc 2px
- Bouton Follow: 20px, position absolue en bas de l'avatar, bg-red-500
- Icônes actions: 24px dans cercle 44px
- Compteurs: Format K (10.8k) au lieu de chiffres complets

### Bottom Info - Nouveau Layout
- Dégradé: `rgba(0,0,0,0.9) 0% → transparent 100%`
- Username: Flex avec badge vérifié ✓ orange
- Description: max 2 lignes + "Unfold"
- Mini avatar: 32px, position absolute right

### Navigation Bottom - Fond Blanc
- Background: `#FFFFFF`
- Border-top: `1px solid rgba(0,0,0,0.08)`
- Icônes: Stroke-width 1.5px (plus fin)
- Couleur inactive: `#999999`
- Couleur active: `#1A1A1A`
