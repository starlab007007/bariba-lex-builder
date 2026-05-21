## Objectif

Produire **5 vidéos MP4 ~15s** présentant chacune un module Fitila dans un **mockup iPhone réaliste** (cadre, encoche, ombre, fond dégradé), avec animations Remotion frame-based reproduisant fidèlement l'UI Fitila.

Livrables dans `/mnt/documents/` :
1. `fitila-demo-dictionnaire.mp4` — recherche « Mardi » FR→BA
2. `fitila-demo-traducteur.mp4` — « Comment vas-tu ? » + boutons texte/audio/photo/coller/document
3. `fitila-demo-classe.mp4` — Niveau 1 → Leçon → Nim, navigation boutons
4. `fitila-demo-fitila-tem-ia.mp4` — payload « Saria gbiika gari mba? » + réponse + source
5. `fitila-demo-apprendre.mp4` — FR → Salutations & politesse → mini quiz

## Approche technique

**Stack** : Remotion + React + Tailwind, rendu via `scripts/render-remotion.mjs` headless dans le sandbox.

**Mockup iPhone** : composant `<PhoneFrame>` réutilisé — cadre 390×844 (iPhone 14), encoche dynamique, status bar (heure/réseau/batterie), bordure noire, ombre portée, posé sur fond dégradé (différent par démo, aux couleurs Fitila).

**Reproduction UI** : je relis les composants Fitila existants (`src/pages/fitila/*`, dictionnaire, traducteur, classe, Fitila Tem IA, apprendre) pour reproduire fidèlement couleurs, typo, icônes Lucide, layouts.

**Contenu** : données réelles fournies par l'utilisateur. Pour les traductions ByT5 et réponses IA, je récupère en amont les vraies réponses via un appel script (ou je les pré-capture depuis la preview) puis je les figerai dans la vidéo — Remotion ne peut pas appeler les services live pendant le rendu.

**Animations par démo** (toutes en `interpolate`/`spring` frame-based) :
- Entrée du mockup phone (spring scale + fade) 0–20 frames
- Curseur animé (point + cercle) qui se déplace vers les éléments cliqués
- Tap feedback (ripple + scale-down du bouton)
- Saisie texte caractère par caractère
- Apparition des résultats avec stagger
- Sortie/fade final

**Rythme 15s @ 30fps = 450 frames** :
- 0–30 : intro mockup + nom du module
- 30–60 : ouverture écran cible
- 60–360 : interaction principale (saisie, tap, résultats)
- 360–450 : highlight résultat + outro

## Structure projet

```
remotion/
  src/
    index.ts
    Root.tsx                    # 5 <Composition> (une par démo)
    components/
      PhoneFrame.tsx            # mockup iPhone réutilisable
      AnimatedCursor.tsx        # curseur tactile animé
      TapRipple.tsx             # feedback tap
      TypewriterText.tsx        # saisie progressive
      FitilaStatusBar.tsx
    demos/
      DictionnaireDemo.tsx
      TraducteurDemo.tsx
      ClasseDemo.tsx
      FitilaTemIADemo.tsx
      ApprendreDemo.tsx
    screens/                    # reproductions fidèles des écrans Fitila
      DictionnaireScreen.tsx
      TraducteurScreen.tsx
      ClasseScreen.tsx
      FitilaTemIAScreen.tsx
      ApprendreScreen.tsx
  scripts/
    render-remotion.mjs         # rendu programmatique (chrome-for-testing, muted)
    render-all.mjs              # boucle sur les 5 compositions
  public/
    fonts/                      # police Fitila si nécessaire
    icons/                      # logo Fitila
```

## Étapes d'exécution

1. **Récupérer le vrai contenu** :
   - Bariba pour « Mardi » : lire `src/data/baribaAlphabet.ts` / corpus dictionnaire
   - Traduction « Comment vas-tu ? » : appeler ByT5 via un petit script Node
   - Réponse IA pour « Saria gbiika gari mba? » : appel à `fitila-tem-ia` edge function
   - Contenu Niveau 1 / Leçon / Nim : lire `learningConfig.ts` et data classe
   - Quiz Salutations & politesse : lire les données apprendre existantes

2. **Lire les écrans réels** pour fidélité visuelle (couleurs, layouts, icônes)

3. **Scaffolder Remotion** dans `remotion/` (bun init, install deps, fix compositor binary, tsconfig)

4. **Coder les composants partagés** (PhoneFrame, curseur, status bar)

5. **Coder chaque démo** (1 composition, scènes scriptées frame par frame)

6. **Spot-check** : `bunx remotion still` sur 2-3 frames clés par démo

7. **Rendre les 5 MP4** via `render-all.mjs` → `/mnt/documents/`

8. **Livrer** avec `<presentation-artifact>` pour chaque fichier

## Détails par démo (script visuel)

**1. Dictionnaire (FR→BA, « Mardi »)**
Écran dictionnaire → curseur tape sur input → frappe « Mardi » lettre par lettre → résultat apparaît : « Mardi → Talaata » (ou terme réel) + définition + bouton audio qui pulse.

**2. Traducteur IA**
Saisie « Comment vas-tu ? » → traduction Bariba apparaît → curseur survole successivement les 5 boutons (texte, audio, photo, coller, document) chacun ~1.5s avec mini tooltip décrivant l'action.

**3. Classe**
Liste niveaux → tap Niveau 1 → liste leçons → tap première leçon → écran Nim avec contenu (carte mot + image + bouton audio + bouton suivant) → tap audio (waveform anime) → tap suivant.

**4. Fitila Tem IA**
Écran chatbot → bulle utilisateur avec « Saria gbiika gari mba? » → indicateur typing → bulle réponse IA apparaît mot par mot → footer « Source : ... » highlight.

**5. Apprendre**
Sélection langue : FR highlighted → liste catégories scroll → tap « Salutations & politesse » → écran leçon → mini quiz : question + 3 choix → tap bonne réponse → animation succès (confetti + ✓).

## Risques et mitigations

- **Récupération contenu IA réel** : si l'appel ByT5/Fitila Tem échoue, je note le fallback utilisé dans le récap final.
- **Compositor sandbox** : suivre la procédure musl/gnu standard.
- **Durée render** : 5 vidéos × ~2-3 min de render chacune = potentiellement long. Je rends en série, une par appel `code--exec`, pour rester sous le timeout 600s.
- **Fidélité UI** : approximation acceptable — c'est un mockup démo, pas une capture pixel-perfect.

## Hors scope

- Pas d'audio/narration (vidéos muettes — sandbox ffmpeg sans libfdk_aac de toute façon)
- Pas de modifications du code de l'app Fitila
- Pas de publication / partage automatique
