

# Plan — Arrêt automatique de l'audio quand la page/fenêtre n'est plus active

## Objectif

Tous les audios des classes (leçons, évaluations, calcul, gestion, grammaire, phonétique, réponses vocales élève, corrigés vocaux enseignant) doivent s'arrêter **automatiquement** dès que :
- L'utilisateur change d'onglet de navigateur
- L'utilisateur minimise la fenêtre
- L'utilisateur navigue vers une autre page de l'app (changement de route)
- L'app passe en arrière-plan sur mobile

## Diagnostic

Tous les composants audio créent leurs `<audio>` éléments en interne via `new Audio(url)` :
- `src/components/classe/ListenButton.tsx` → audio des contenus pédagogiques
- `src/components/classe/VoiceAnswerPlayer.tsx` → audio réponses vocales (élève + corrigé enseignant)

Le hook `usePageVisibility()` existe déjà (`src/hooks/usePageVisibility.ts`) mais n'est **utilisé nulle part** pour stopper les audios. Aucun listener `visibilitychange` ni `beforeunload` ni cleanup sur changement de route n'arrête actuellement les lectures en cours.

## Implémentation

### 1. Nouveau hook `useAutoStopAudio`

Créer `src/hooks/useAutoStopAudio.ts` :
- Prend une `ref` vers un élément `HTMLAudioElement` et un setter `setPlaying`
- Écoute :
  - `document.visibilitychange` → si `document.hidden` → pause + reset `currentTime`
  - `window.pagehide` et `window.blur` → idem (couvre mobile/PWA/Capacitor)
  - `useLocation()` de react-router → cleanup au changement de pathname
- Retourne rien ; effet de bord uniquement

### 2. Intégrer dans `ListenButton.tsx`

- Importer `useAutoStopAudio`
- Appeler le hook en passant `audioRef` et `setPlaying`
- Garantit que tous les boutons 🔊 (leçons, alphabet, calcul, eval, gestion, grammaire, phonétique Sɔ̃ɔsiru, etc.) s'arrêtent

### 3. Intégrer dans `VoiceAnswerPlayer.tsx`

- Même intégration → couvre les réponses vocales élève et corrigés vocaux enseignant (UniversalAnswerCard + ClasseCorrections + AnswerReview)

### 4. (Optionnel mais recommandé) Stop global Web Speech / TTS

Dans le hook, ajouter aussi `window.speechSynthesis?.cancel()` au cas où des TTS Web Speech tourneraient (ex. UnifiedAudioService).

## Fichiers

**Nouveau**
- `src/hooks/useAutoStopAudio.ts`

**Modifications**
- `src/components/classe/ListenButton.tsx` — appel du hook
- `src/components/classe/VoiceAnswerPlayer.tsx` — appel du hook

## Garanties

- ✅ Audio s'arrête immédiatement au changement d'onglet/fenêtre
- ✅ Audio s'arrête au changement de page (route React Router)
- ✅ Audio s'arrête sur mobile lors du passage en arrière-plan (Capacitor)
- ✅ Couvre TOUS les contenus de classes (N1 + N2) car centralisé dans 2 composants partagés
- ✅ Pas de fuite mémoire : cleanup propre des listeners

## Hors scope

- Reprise automatique au retour sur la page (l'utilisateur devra recliquer sur ▶️)

