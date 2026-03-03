

## Plan: Correction des 5 bugs majeurs + 3 bugs apprentissage

### Bug 1: Voix systeme toujours en anglais

**Diagnostic**: L'edge function `french-tts` priorise deja ElevenLabs (voix FR natives). Le probleme est cote client : quand le serveur renvoie `method: 'web-speech-synthesis'` (fallback), le client ne synthetise pas avec `speechSynthesis` en `lang='fr-FR'`. De plus, les composants qui utilisent `speechSynthesis` directement (narration dans BranchingPlayer, etc.) ne forcent pas `lang = 'fr-FR'`.

**Solution**:
- Dans `BranchingPlayer.tsx`, forcer `utterance.lang = 'fr-FR'` sur toute utilisation de `speechSynthesis`
- Verifier tous les appels `speechSynthesis` dans le codebase et forcer `fr-FR`
- Dans `SegmentEditor.tsx`, ajouter un fallback client Web Speech API quand le TTS serveur renvoie `method: 'web-speech-synthesis'`

**Fichiers**: `BranchingPlayer.tsx`, `SegmentEditor.tsx`, tout fichier utilisant `speechSynthesis`

---

### Bug 2: Lecture du contenu en arriere-plan (tab switch)

**Diagnostic**: Le hook `usePageVisibility` existe et est integre dans `VideoFeedCard`, `AudioFeedCard`, `TamTamVideoFeed`. Il faut verifier que la logique fonctionne bien pour TOUS les types de medias sur la page d'accueil, y compris les `<audio>` dans les composants audio du feed. Le `BranchingPlayer` utilise aussi `usePageVisibility` — il faut aussi couvrir les stories/contes.

**Solution**: Audit et correction de la logique de pause dans chaque composant. S'assurer que la reprise ne se fait que si le media etait actif au moment du masquage.

**Fichiers**: `VideoFeedCard.tsx`, `AudioFeedCard.tsx`, `TamTamVideoFeed.tsx`

---

### Bug 3: Description des posts non visible dans le feed

**Diagnostic**: `VideoFeedCard.tsx` n'affiche que `authorUsername` et la date en bas a gauche. Il n'affiche ni `transcript_fr`, ni `transcript_ba`, ni aucun texte descriptif du post. Meme chose pour `AudioFeedCard`.

**Solution**: Ajouter l'affichage de `post.transcript_fr || post.transcript_ba` sous le username dans la zone bottom-left du `VideoFeedCard`, avec un style `line-clamp-2` pour ne pas surcharger l'ecran (comme TikTok/Reels).

**Fichiers**: `VideoFeedCard.tsx`

---

### Bug 4: Impossible de jouer ses posts depuis le portfolio

**Diagnostic**: `MyPostViewerOverlay.tsx` gere la lecture via `togglePlay()` mais :
1. Pour les videos, il utilise `videoRef.current.play()` sans `muted` ni `playsInline`, ce qui echoue souvent sur mobile
2. Pour l'audio, il cree un `new Audio()` a chaque appel sans nettoyer l'ancien
3. La video ne demarre pas automatiquement a l'ouverture

**Solution**:
- Ajouter `muted` et `playsInline` sur le `<video>`
- Auto-play a l'ouverture du viewer
- Gerer correctement le cycle de vie des refs audio (cleanup sur changement d'index)
- Ajouter un bouton play visible pour les videos et l'audio

**Fichiers**: `MyPostViewerOverlay.tsx`

---

### Bug 5: Illustration du conte pas intelligente

**Diagnostic**: `autoIllustrate.ts` existe deja avec scoring semantique et bonus video +3. Il est integre dans `StoryBuilder.tsx` et `SceneEditor.tsx`. Le probleme signale persiste, ce qui indique que :
1. Le seuil minimum (5) est peut-etre trop haut, resultant en pas de match
2. Les dictionnaires de mots-cles sont principalement en francais mais les contes peuvent contenir du bariba
3. Le `usage_count` tri ascendant favorise des assets jamais utilises (potentiellement peu pertinents)

**Solution**:
- Baisser le seuil minimum de 5 a 3
- Ajouter un fallback : si aucun match >= seuil, prendre le meilleur candidat video disponible
- Ameliorer le scoring en donnant plus de poids a la similarite textuelle
- Logger les scores pour debugger

**Fichiers**: `autoIllustrate.ts`

---

### Bug 6 (Apprentissage): Audio pour l'ecoute manquant

**Diagnostic**: Les lecons dans `learningFoundations.ts` et `learningExercises.ts` n'ont pas de champ audio. Les mots bariba sont affiches mais pas ecoutables.

**Solution**: Ajouter un bouton "Ecouter" a cote de chaque mot/expression bariba dans `FitilaLearn.tsx` qui utilise le TTS bariba existant (`bariba-tts` edge function) pour lire le mot a haute voix.

**Fichiers**: `FitilaLearn.tsx` (composant de rendu des lecons)

---

### Bug 7 (Apprentissage): Confusion koko/riz vs bouillie

**Diagnostic**: Dans `learningFoundations.ts`, "koko" est traduit uniquement par "riz". En bariba, "koko" designe la bouillie de cereales (qu'on BOIT = nonra), pas le riz cru. Le riz se dit "monri" et se MANGE (di). Les exemples "Na koko di" sont donc incorrects linguistiquement.

**Solution**: Corriger les donnees linguistiques :
- `koko` = bouillie (cereales) → verbe: `nonra` (boire)
- `monri` = riz → verbe: `di` (manger)
- Corriger tous les exemples SOV : "Na koko nonra" (je bois de la bouillie), "Na monri di" (je mange du riz)
- Mettre a jour le tableau nourriture, les exemples grammaticaux et les quiz

**Fichiers**: `learningFoundations.ts`, `learningExercises.ts`, `baribaLinguisticKnowledge.ts`

---

### Bug 8 (Apprentissage): Incoherences dans Expressions & Idiomes

**Diagnostic**: La section 11 (Expressions & Idiomes) contient des expressions dont les sens literaux ne correspondent pas aux traductions. Les expressions bariba sur les emotions semblent correctes (suu doma, suu senra), mais les proverbes et certaines salutations meritent une verification.

**Solution**: Revoir et corriger les expressions suivantes dans la lecon 11 :
- Verifier chaque expression bariba avec son sens litteral et sa traduction
- Corriger les erreurs identifiees
- Ajouter des notes de contexte culturel pour eviter les confusions

**Fichiers**: `learningFoundations.ts`

---

### Resume des fichiers a modifier

| Fichier | Corrections |
|---------|------------|
| `src/components/feed/VideoFeedCard.tsx` | Afficher description du post |
| `src/components/tamtam/MyPostViewerOverlay.tsx` | Fix playback audio/video |
| `src/features/conte-vivant/utils/autoIllustrate.ts` | Baisser seuil, fallback video |
| `src/features/conte-vivant/components/BranchingPlayer.tsx` | Forcer lang fr-FR sur speechSynthesis |
| `src/data/learningFoundations.ts` | Corriger koko/monri + expressions |
| `src/data/learningExercises.ts` | Corriger koko/monri |
| `src/data/baribaLinguisticKnowledge.ts` | Corriger exemples SOV |
| `src/pages/fitila/FitilaLearn.tsx` | Bouton audio TTS par mot |

