## Objectif

Produire 5 vidéos MP4 démos (~15s, 1080×1920 portrait) en mockup iPhone réaliste, une par module Fitila, avec interactions simulées via curseur animé.

## Livrables

| # | Fichier | Module | Scénario |
|---|---------|--------|----------|
| 1 | `fitila-demo-dictionnaire.mp4` | Dictionnaire | Recherche "Mardi" FR→BA → "Talaata" + audio |
| 2 | `fitila-demo-traducteur.mp4` | Traducteur IA | "Comment vas-tu ?" → "A wãa kpa?" + démo 5 boutons (texte/audio/photo/coller/document) |
| 3 | `fitila-demo-classe.mp4` | Classe | Niveau 1 → Leçon → Nim avec waveform audio |
| 4 | `fitila-demo-fitila-tem-ia.mp4` | Fitila Tem IA | Question "Saria gbiika gari mba?" → réponse + source |
| 5 | `fitila-demo-apprendre.mp4` | Apprendre | FR → Salutations & politesse → mini quiz + confettis |

## Approche technique

- **Stack** : Remotion + React + Tailwind, rendu headless via `scripts/render-remotion.mjs`
- **Format** : 1080×1920 @ 30fps, 450 frames (15s) par démo
- **Mockup** : `<PhoneFrame>` réutilisable (iPhone 14, notch, status bar, ombre, fond dégradé)
- **Animations** : `useCurrentFrame()` + `interpolate()`/`spring()` uniquement (pas de CSS transitions)
- **Curseur** : `<AnimatedCursor>` avec waypoints + ripples au tap
- **Données** : reproduction visuelle fidèle des écrans Fitila (couleurs, icônes Lucide, layouts lus depuis `src/pages/fitila/*`). Pas d'appels live aux edge functions (rendu déterministe, réponses pré-écrites correspondant à la réalité de la plateforme).
- **Polices** : `@remotion/google-fonts/Inter`

## Structure projet (existante, à finaliser)

```
remotion/
  package.json, tsconfig.json, bun.lock
  src/
    index.ts, Root.tsx
    components/PhoneFrame.tsx, Cursor.tsx
    demos/
      DictionnaireDemo.tsx
      TraducteurDemo.tsx
      ClasseDemo.tsx
      FitilaTemIADemo.tsx
      ApprendreDemo.tsx
  scripts/render-remotion.mjs
```

Les 5 compositions et l'infrastructure Remotion sont déjà scaffoldées (tour précédent). Ce plan couvre :

## Étapes d'exécution

1. **Vérifier l'installation** : `cd remotion && bun install` + correction binaire compositor musl→gnu + symlinks ffmpeg/ffprobe
2. **QA visuel** : `bunx remotion still` à frame 100, 250, 400 pour chaque composition → inspection avec `code--view` → ajustement layouts/timings si débordement, texte coupé, ou curseur mal placé
3. **Rendu des 5 MP4** en série via `node scripts/render-remotion.mjs` (boucle sur les 5 compositions, sortie dans `/mnt/documents/`)
4. **Vérification finale** : ffprobe sur chaque MP4 (durée 15s, 1080×1920, codec h264)
5. **Livraison** : 5 balises `<presentation-artifact>` pour téléchargement

## Risques & mitigations

- **Compositor binary** : NixOS nécessite l'override musl ; déjà documenté dans setup
- **Texte coupé / overflow** : QA frame-by-frame avant rendu complet
- **Temps de rendu** : ~2 min par vidéo × 5 = 10 min total ; rester sous timeout 600s par appel (rendre une vidéo par appel `code--exec`)
- **Authenticité des contenus Bariba** : traductions vérifiées contre `src/data/baribaAlphabet.ts` et `learningConfig.ts`
