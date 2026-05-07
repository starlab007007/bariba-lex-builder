
## Problème 1 : Le clavier Bariba natif fait planter l'application

### Diagnostic
Le `BaribaInputMethodService.kt` utilise `resources.getIdentifier()` pour trouver les boutons par ID. Si un ID référencé dans le code n'existe pas dans le layout XML (ex: `key_question`, `key_exclaim`), `findViewById` retourne `null` mais le code continue sans crash. Cependant le problème principal est que le layout XML (`keyboard_bariba.xml`) utilise un style `@style/BaribaKey` qui référence `@drawable/key_background` — si ce drawable n'est pas correctement copié ou est incompatible, l'inflation du layout échoue et l'app plante.

Corrections :
1. Ajouter des gardes `try-catch` autour de `onCreateInputView()` pour éviter les crashs fatals lors de l'inflation du layout
2. Ajouter un fallback si le layout ne peut pas être chargé (retourner une vue simple au lieu de crasher)
3. Wraper `setupKeys()` dans un try-catch pour éviter les NPE sur les boutons manquants

### Message d'alerte Android
Le message "Ce mode de saisie est susceptible d'enregistrer le texte..." est un **avertissement système Android** obligatoire. Il est impossible de le supprimer — c'est Android qui l'affiche, pas l'application. C'est normal et attendu pour tout clavier tiers.

## Problème 2 : Le bouton (+) flottant instable

### Diagnostic
Le bouton utilise `absolute left-1/2 -translate-x-1/2 -top-4` ce qui le fait flotter au-dessus de la barre de navigation avec un positionnement qui peut être instable selon les tailles d'écran. Il manque un ancrage solide.

### Correction
Remplacer le positionnement absolu par une approche intégrée dans le flux du layout : le bouton sera placé dans le centre spacer avec un positionnement relatif stable, en utilisant `flex items-center justify-center` et un léger décalage vers le haut avec `mb-2` au lieu d'un positionnement absolu.

## Fichiers modifiés
- `android-native/java/com/fitila/bariba/BaribaInputMethodService.kt` — try-catch robuste
- `src/components/tamtam/KuaishouBottomNav.tsx` — bouton (+) stable
