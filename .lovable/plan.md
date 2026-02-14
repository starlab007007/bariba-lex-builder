

# Corriger le traducteur : responsivite, audio, et barre du bas

## Problemes identifies

1. **Champs du bas caches** : Le layout utilise `min-h-screen` avec `sticky bottom-0`, ce qui fait que sur les petits ecrans les champs de saisie et le micro sont partiellement caches ou coupes.

2. **Envoi audio echoue** : Le `TamTamMicButton` est appele avec `autoTranscribe={false}` (ligne 681), donc il retourne juste l'audio brut sans transcription. Ensuite `handleVoiceResult` verifie `result.transcription` pour le francais, qui est toujours vide. L'audio est enregistre mais jamais transcrit ni envoye. De plus, `useWebSpeechSTT` provoque une erreur `InvalidStateError` car `recognition.start()` est appele alors que la reconnaissance est deja en cours.

3. **Barre de navigation du bas** : La barre "Home / Featured / + / Message / Me" (`KuaishouBottomNav`) est rendue en `fixed bottom-0 z-50` et apparait sur certains etats de navigation. Elle masque les champs de saisie du traducteur.

## Corrections prevues

### 1. Layout responsif (TamTamTranslator.tsx)

- Remplacer `min-h-screen` par `h-[100dvh]` pour verrouiller la hauteur a l'ecran (pattern standard FITILA)
- La structure sera : header (sticky/fixed) + zone de messages (flex-1 overflow-y-auto) + zone de saisie (flex-shrink-0) en bas
- Supprimer `sticky bottom-0` de la zone de saisie et la rendre partie du flux flex pour qu'elle reste toujours visible
- La zone de messages scrollera independamment

### 2. Activer autoTranscribe et corriger le pipeline audio (TamTamTranslator.tsx + TamTamMicButton.tsx)

- Passer `autoTranscribe={true}` sur le `TamTamMicButton` dans le traducteur pour que la transcription se fasse automatiquement (Mistral pour le francais, HuggingFace pour le bariba)
- Dans `handleVoiceResult` : utiliser `result.transcription` qui sera desormais rempli automatiquement par le mic button
- Corriger l'erreur `InvalidStateError` dans `TamTamMicButton` : ajouter un garde `try/catch` specifique autour de `webSpeechSTT.startListening()` pour ignorer les erreurs `InvalidStateError` quand la reconnaissance est deja en cours

### 3. Supprimer la barre de navigation du bas (TamTamTranslator.tsx)

- Cacher la `KuaishouBottomNav` quand on est sur la page traducteur. Comme ce composant est `fixed bottom-0`, on va le masquer en ajoutant une detection de route dans `KuaishouBottomNav.tsx` lui-meme, OU plus simplement, puisque ce composant n'est PAS rendu dans FitilaApp mais uniquement dans KuaishouLayout (qui n'est pas utilise par le traducteur), le probleme vient peut-etre d'un autre rendu. Alternative : ajouter un `z-index` plus eleve sur la zone de saisie du traducteur pour la placer au-dessus de tout bottom nav residuel, et s'assurer que le traducteur occupe tout l'ecran.

## Details techniques

**Fichiers modifies :**

- `src/pages/tamtam/TamTamTranslator.tsx` :
  - Layout : `h-[100dvh]` + structure flex sans scroll global
  - `autoTranscribe={true}` sur le TamTamMicButton
  - Zone de saisie : `flex-shrink-0` au lieu de `sticky bottom-0`, z-index eleve
  
- `src/components/tamtam/TamTamMicButton.tsx` :
  - Ajouter garde contre `InvalidStateError` dans la section de demarrage du Web Speech API (ligne ~157)

**Structure cible du layout :**
```text
div (h-[100dvh], flex flex-col)
  |-- Header (flex-shrink-0)
  |-- Sub-header langues (flex-shrink-0)
  |-- Zone messages (flex-1, overflow-y-auto)
  |-- Zone saisie (flex-shrink-0, z-50, bg-white)
```

