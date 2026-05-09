# Plan : Tests et finalisation avant déploiement

## Objectif
Vérifier que (1) le clavier Bariba s'active, se sélectionne et s'utilise sans crash, et (2) le guide interactif est totalement responsive et dynamique sur web et mobile.

## 1. Tests du clavier Bariba (web + APK)

### Vérifications statiques
- Relire `BaribaInputMethodService.kt` pour confirmer la robustesse (try/catch, fallback view, pas de cast AppCompat).
- Vérifier `AndroidManifest.xml` (les 2 copies) : présence de `android:theme="@android:style/Theme.DeviceDefault.InputMethod"` sur le service IME.
- Vérifier `keyboard_bariba.xml` (les 4 copies) : tous les `<Button>` qualifiés `<android.widget.Button>` pour bypasser AppCompat.
- Vérifier `styles_keyboard.xml` : style `BaribaKey` n'hérite pas d'un thème AppCompat.
- Vérifier `method.xml` et déclarations IME.

### Tests interactifs (preview web)
- Naviguer sur `/fitila/social` via browser tools.
- Tester `BaribaKeyboardInput` : saisie, caractères spéciaux (ɔ ɛ ŋ ã ĩ ũ), suggestions phonétiques, bascule FR/Bariba.
- Vérifier les pages `FloatingKeyboardPage` et `InstallPage`.

### Audit APK (si problème détecté)
- Relire les fichiers `.apk` packagés (manifest binaire) — déjà fait précédemment, mais re-confirmer la version actuelle.
- Documenter les étapes pour rebuild l'APK : `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug`.

## 2. Tests du guide interactif (responsive)

### Vérifications statiques
- `TourSpotlight.tsx` : confirmer clamping viewport, safe-area-inset, max-h dynamique, fallback centré si cible absente.
- `AppTourProvider.tsx` : confirmer détection `fitila_install_id` pour APK fresh install, navigation auto entre pages.
- `tourSteps.ts` : vérifier que tous les `data-tour` ciblés existent dans le DOM des pages correspondantes.

### Tests responsive (browser tool)
Tester le guide à 4 viewports :
- 360x800 (mobile petit / APK typique)
- 390x844 (mobile standard)
- 768x1024 (tablette)
- 1280x720 (desktop)

Pour chaque viewport :
- Déclencher le tour (reset `localStorage`).
- Vérifier que la bulle reste dans l'écran, ne déborde pas, le spotlight s'aligne sur la cible.
- Tester navigation entre étapes (Suivant/Précédent), audio TTS bilingue, bouton Skip.
- Vérifier sur les pages clés : Auth, Home, Social, Menu, Tabs.

### Corrections si nécessaire
- Ajuster `TourSpotlight` (positionnement, tailles de police, padding) selon problèmes constatés.
- Ajouter media queries Tailwind manquantes.
- Améliorer fallback si élément `data-tour` introuvable (skip auto vers étape suivante).

## 3. Validation finale & prêt au déploiement

- Vérifier console logs (aucune erreur bloquante).
- Vérifier network (aucune requête échouée critique).
- Confirmer que `npx cap sync` n'est pas nécessaire (ou documenter si c'est le cas).
- Build PWA : confirmer manifest, service worker, icônes.
- Bouton "Revoir le guide" fonctionnel dans `FitilaApp`.
- Résumé final : statut keyboard ✓, guide responsive ✓, prêt à publier.

## Fichiers susceptibles d'être modifiés
- `src/components/onboarding/TourSpotlight.tsx` (ajustements responsive)
- `src/components/onboarding/AppTourProvider.tsx` (fallback si cible absente)
- `src/components/onboarding/tourSteps.ts` (corrections de sélecteurs)
- `android/app/src/main/res/layout/keyboard_bariba.xml` (si crash résiduel)

Aucune modification de logique métier ou de DB.
