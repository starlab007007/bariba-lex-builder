
# Clavier Flottant Bariba-Français — Solution Overlay

## Concept

Un clavier flottant accessible depuis n'importe quelle application Android. L'utilisateur tape en Bariba dans une bulle superposée, le texte est copié dans le presse-papier, puis collé dans WhatsApp ou toute autre app.

## Architecture

### 1. Bulle Flottante (Floating Overlay Service)

Un service Android natif qui affiche une bulle Fitila par-dessus les autres applications :

- **Bouton flottant** : Icône Fitila draggable, toujours visible sur l'écran
- **Au tap** : Ouvre un mini-panneau avec le clavier Bariba complet
- **Fonctionnalités** : Saisie avec suggestions prédictives, caractères spéciaux Bariba (ɔ, ɛ, ŋ, ã...), bascule Bariba/Français
- **Bouton "Copier"** : Copie le texte dans le presse-papier, ferme le panneau, l'utilisateur colle dans l'app cible

### 2. Implémentation Technique

Le service overlay nécessite un plugin Capacitor personnalisé :

| Composant | Technologie |
|-----------|------------|
| Service Overlay Android | Kotlin `WindowManager` + `TYPE_APPLICATION_OVERLAY` |
| UI du clavier flottant | WebView locale chargeant une page React dédiée |
| Dictionnaire | Fichier JSON embarqué dans les assets Android |
| Presse-papier | API Clipboard native Android |
| Plugin Capacitor | Bridge entre React et le service natif |

### 3. Fichiers a creer dans Lovable

| Fichier | Description |
|---------|-------------|
| `src/pages/fitila/FloatingKeyboardPage.tsx` | Page React du clavier flottant (UI minimale optimisee pour overlay) |
| `src/components/keyboard/FloatingBaribaKeyboard.tsx` | Composant clavier complet avec suggestions, caracteres speciaux, copie |
| `src/components/keyboard/KeyboardActivationGuide.tsx` | Guide d'activation avec instructions pas-a-pas |
| `src/hooks/useFloatingKeyboard.ts` | Hook pour la logique du clavier flottant et clipboard |
| Route dans App.tsx | `/fitila/keyboard` pour acceder au clavier et au guide |
| Menu dans FitilaApp.tsx | Entree "Clavier Bariba" dans le side menu |

### 4. Page d'activation dans l'app

Une page `/fitila/keyboard` accessible depuis le menu lateral avec :
- Bouton "Activer le clavier flottant" (lance le service overlay)
- Tutoriel visuel en 3 etapes : 1) Autoriser l'overlay 2) Taper en Bariba 3) Coller dans WhatsApp
- Option "Demarrer au lancement" pour activer la bulle automatiquement
- Preview du clavier pour tester avant d'aller sur une autre app

### 5. Fonctionnalites du clavier flottant

- **Suggestions predictives** : Reutilise `usePhoneticSuggestions` avec l'index phonetique et Levenshtein
- **Caracteres speciaux Bariba** : Rangee dediee (ɔ, ɛ, ŋ, ã, tons)
- **Bascule langue** : Globe button pour alterner Bariba/Francais
- **Copie rapide** : Un tap copie tout le texte et affiche un toast de confirmation
- **Historique** : Les 10 derniers textes copies sont sauvegardes localement
- **Mode compact** : Le panneau se reduit en bulle quand non utilise

### 6. Permission Android requise

```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
```

L'utilisateur doit accorder manuellement la permission "Afficher par-dessus d'autres applications" dans les parametres Android.

### 7. Etapes d'implementation

1. Creer le composant `FloatingBaribaKeyboard` avec le clavier complet, suggestions, et copie clipboard
2. Creer la page `FloatingKeyboardPage` comme mini-app autonome
3. Creer le guide d'activation `KeyboardActivationGuide`
4. Ajouter la route et l'entree menu dans l'app
5. Documenter les instructions pour le plugin Capacitor natif (le code Kotlin du service overlay devra etre ajoute manuellement dans Android Studio apres `cap sync`)

## Limites et transparence

- La partie **service overlay Android** (bulle flottante par-dessus les autres apps) necessite du code Kotlin natif qui ne peut pas etre execute dans Lovable — je fournirai la documentation et le code a copier dans Android Studio
- La partie **UI du clavier, suggestions, clipboard** est entierement faisable dans Lovable
- Sur iOS, les overlays systeme ne sont pas supportes — cette fonctionnalite sera Android uniquement
