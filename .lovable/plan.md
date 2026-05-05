
# Correction des permissions caméra/micro sur Android

## Problème identifié

Le fichier `src/components/tamtam/creator/KuaishouCaptureMode.tsx` (ligne 72) démarre automatiquement la caméra et le micro dans un `useEffect` au montage du composant. Sur Android (WebView Capacitor), `getUserMedia` est bloqué si l'appel ne provient pas directement d'un geste utilisateur (clic/tap).

C'est le **seul endroit problématique** dans le code. Tous les autres appels `getUserMedia` (useAudioRecorder, useVoiceDetection, useTamTamAudioRecorder, StoryInput, etc.) sont déjà déclenchés par des actions utilisateur (boutons).

## Correction

### 1. Ajouter un état "permission gate" dans KuaishouCaptureMode

- Ajouter un état `cameraReady` (initialement `false`)
- Quand `cameraReady` est `false`, afficher un écran d'attente avec un bouton "Activer la caméra"
- Au clic sur ce bouton, appeler `getUserMedia` puis passer `cameraReady` a `true`
- Le `useEffect` actuel (ligne 72-117) sera transformé pour ne s'exécuter que quand `cameraReady` est `true`

### 2. Modifier CaptureEngine.initializeCamera

- Aucun changement necessaire -- il est deja appele manuellement, le probleme est uniquement dans le useEffect du composant

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/tamtam/creator/KuaishouCaptureMode.tsx` | Remplacer le useEffect auto-start par un bouton utilisateur + etat `cameraReady` |

### Resultat attendu

- Sur Android: l'utilisateur voit un ecran avec un bouton "Demarrer la camera"
- Au clic, les permissions sont demandees et la camera s'active
- Le reste du flux (enregistrement, effets, etc.) fonctionne normalement
