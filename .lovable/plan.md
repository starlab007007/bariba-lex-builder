
# Live Transcription Synchronisée + Finalisation Complète des Feeds Audio

## Vision Innovante : Style "Karaoké Patrimonial"

Transformer les feeds Patrimoine et Voix du Village en expérience immersive avec :
- Transcription en temps réel synchronisée mot par mot avec l'audio (style karaoké)
- Tous les boutons d'interaction fonctionnels (Suivre, Mute, Vitesse, Nav)
- Badge de type de patrimoine/voix conforme à la sélection de l'auteur

---

## Analyse de l'existant

### Ce qui existe déjà
- `TamTamSocial.tsx` : Composant `AudioFeedCard` interne (lignes ~300-587) avec disque vinyle, contrôles audio, interactions via `usePostInteractions`
- `src/components/feed/AudioFeedCard.tsx` : Version standalone du composant (non connectée aux interactions réelles)
- `KaraokeSubtitles` : Composant déjà créé pour le feed vidéo, basé sur framer-motion avec glassmorphism
- `post.transcript_fr` : Champ de transcription déjà disponible sur les posts
- Speed (`1x`) et Volume (`Volume2`) : Boutons UI présents MAIS non fonctionnels (pas de handler)
- Bouton Suivre : Présent et connecté à `usePostInteractions`, mais la navigation vers post suivant/précédent est absente

### Ce qui manque
1. **Live Transcription** : Le texte `transcript_fr` est affiché statiquement (80 chars tronqués). Il n'y a pas de synchronisation mot-par-mot avec `currentTime`
2. **Vitesse (Speed)** : Le bouton `1x` n'a pas de handler — `audioRef.playbackRate` non modifié
3. **Mute** : Bouton Volume2 non connecté — `audioRef.muted` non géré
4. **Navigation Post** : Boutons Next/Previous pour passer au post suivant/précédent dans le feed absents du card
5. **Titre du type** : Le badge de catégorie (ex : "Conte", "Annonce") est absent en haut du card
6. **Segmentation texte** : La transcription n'est pas découpée en mots avec timestamps estimés

---

## Architecture de la Solution

### Technique de synchronisation sans timestamps

Mistral Voxtral renvoie du texte brut (pas de `word_timestamps` en mode simple). La technique utilisée est l'**estimation proportionnelle** :

```text
Durée audio totale = 60s
Texte = "Il était une fois un lion dans la savane..."
Nombre de mots = 12
→ Chaque mot dure ~60/12 = 5s
→ Mot 1 actif de t=0 à t=5s, Mot 2 de t=5s à t=10s, etc.
```

Cette technique est rapide, sans appel réseau supplémentaire, et donne un effet karaoké convaincant.

Pour les posts avec `transcript_fr` stocké, on parse le texte au chargement de la card.

---

## Changements Techniques

### Fichier 1 : `src/pages/tamtam/TamTamSocial.tsx` — Composant `AudioFeedCard` interne (lignes ~300-587)

**A. Nouveaux états à ajouter**

```text
const [playbackRate, setPlaybackRate] = useState(1);
const [isMuted, setIsMuted] = useState(false);
const [activeWordIndex, setActiveWordIndex] = useState(-1);
```

**B. Parsing de la transcription en mots**

```text
const words = useMemo(() => {
  if (!post.transcript_fr) return [];
  return post.transcript_fr.trim().split(/\s+/);
}, [post.transcript_fr]);
```

**C. Synchronisation mots → currentTime**

Dans le `useEffect` de `timeupdate`, calculer l'index du mot actif :
```text
const wordDuration = audioDuration / words.length;
const wordIndex = Math.floor(currentTime / wordDuration);
setActiveWordIndex(wordIndex);
```

**D. Contrôle de vitesse (Speed)**

Cycles : 1x → 1.5x → 2x → 0.75x → 1x

```text
const cycleSpeed = () => {
  const speeds = [1, 1.5, 2, 0.75];
  const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
  setPlaybackRate(next);
  if (audioRef.current) audioRef.current.playbackRate = next;
};
```

**E. Mute/Unmute**

```text
const toggleMute = () => {
  setIsMuted(m => !m);
  if (audioRef.current) audioRef.current.muted = !isMuted;
};
```

**F. Navigation Post Suivant/Précédent**

Ajouter des props `onNext` et `onPrevious` au composant, appelées depuis le feed parent qui gère `activeIndex`. Des flèches discrètes en haut du card :

```text
<button onClick={onPrevious}>↑ Post précédent</button>
<button onClick={onNext}>↓ Post suivant</button>
```

**G. Badge type de patrimoine/voix en haut**

```text
// En haut à droite : badge template
<div className="badge-template">
  <span>{template.emoji}</span>
  <span>{template.name}</span>   // ex: "Conte", "Proverbe", "Annonce"
</div>
```

**H. Composant Live Transcription (karaoké)**

Un bloc glassmorphism en bas du card, au-dessus des contrôles, affichant les mots un par un avec le mot actif en surbrillance animée :

```text
// Affiche 5 mots autour du mot actif, mot courant en blanc/gras/scale
// Les autres mots en blanc/50
// Animation framer-motion scale + glow sur le mot actif
```

---

## Interface Visuelle Complète

```text
┌─────────────────────────────┐
│ [↑] [Badge: 🦁 Conte]  [🔔] │  ← Top bar: nav prev, badge type, notif
│                             │
│     🎴 Disque Vinyle        │  ← Disque animé (rotation si playing)
│                             │
│ ──── Waveform bars ────     │
│  Titre du post              │
│  @auteur · Communauté       │
│  [+ Suivre] ou [✓ Abonné]  │
│                             │
│  ┌ glassmorphism ─────── ┐  │  ← LIVE TRANSCRIPTION KARAOKÉ
│  │ ...il était **UNE**   │  │     Mot actif = blanc gras + glow
│  │ fois un lion...       │  │     Autres = blanc/50
│  └───────────────────────┘  │
│                             │
│  ⏪  ▶/⏸  ⏩   0:12 / 1:45 │  ← Contrôles + durée
│  [1x] [🔊/🔇]              │  ← Speed + Mute FONCTIONNELS
│                             │
│                  [♥] Like   │  ← Sidebar droite
│                  [🎙] Reply │
│                  [↺] Remix  │
│                  [↗] Share  │
│                  [🔖] Save  │
│                             │
│ [Avatar] @auteur            │
│          Nom Affiché        │
│             [↓ Post suivant]│  ← Nav next bas gauche
└─────────────────────────────┘
```

---

## Fichiers Modifiés

| Fichier | Changement |
|---|---|
| `src/pages/tamtam/TamTamSocial.tsx` | Refactor `AudioFeedCard` interne : karaoké, speed, mute, nav, badge type |
| `src/components/feed/AudioFeedCard.tsx` | Même corrections appliquées pour cohérence (standalone card) |

---

## Résumé des Fonctionnalités

| Fonctionnalité | Avant | Après |
|---|---|---|
| Transcription | Texte statique 80 chars | Karaoké mot-par-mot synchronisé |
| Speed | Bouton `1x` décoratif | Cycle 1x → 1.5x → 2x → 0.75x fonctionnel |
| Mute | Icône décorative | Toggle mute réel sur l'audio |
| Navigation | Scroll manuel uniquement | Boutons ↑ ↓ pour naviguer entre posts |
| Badge type | Absent | Badge emoji + nom en haut (Conte, Proverbe, Annonce...) |
| Suivre | Connecté mais sans feedback visuel fort | Animation + état persistant via `usePostInteractions` |
