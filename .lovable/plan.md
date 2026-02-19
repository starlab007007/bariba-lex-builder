
# Fitila IA - ChatGPT Bariba

## Objectif

Ajouter un module "Fitila IA" a cote de "Apprendre" dans la section Outils du menu. C'est un chatbot style ChatGPT ou tout se passe en Bariba cote utilisateur, mais en arriere-plan le pipeline est :

```text
Question Bariba (texte/voix)
  -> ByT5 traduit en Francais
    -> Gemini 2.5 Flash Lite repond en Francais (1 paragraphe max)
      -> ByT5 traduit la reponse en Bariba
        -> Affichage en Bariba
```

## Architecture

### 1. Edge Function : `fitila-ia-chat`

Nouvelle edge function qui orchestre tout le pipeline en backend :

- Recoit : `{ message: string, lang: "bariba" }` (texte en bariba)
- Etape 1 : Appelle `byt5-bariba-translate` en interne (ba -> fr) pour traduire la question
- Etape 2 : Appelle Lovable AI Gateway (Gemini 2.5 Flash Lite) avec un system prompt limitant les reponses a 1 paragraphe
- Etape 3 : Appelle `byt5-bariba-translate` en interne (fr -> ba) pour traduire la reponse
- Retourne : `{ response_ba: string, response_fr: string }` (les deux pour debug)

Config dans `supabase/config.toml` : `verify_jwt = false`

### 2. Page : `src/pages/fitila/FitilaIA.tsx`

Interface chat simple style ChatGPT :

- Header avec bouton retour et titre "Fitila IA" / emoji robot
- Zone de messages (bulles) en Bariba uniquement
- Zone de saisie en bas : champ texte + bouton micro (reutilise les hooks existants `useBaribaSTTWithFallback` et `useAudioRecorder`)
- Quand l'utilisateur parle en bariba : transcription bariba -> envoi au backend -> reponse bariba affichee
- Quand l'utilisateur tape en bariba : envoi direct au backend -> reponse bariba affichee
- Indicateur de chargement pendant le traitement
- Reponses limitees a 1 paragraphe

### 3. Integration dans le menu et le routeur

**`src/pages/fitila/FitilaApp.tsx`** : Ajouter "Fitila IA" dans `toolsItems` avec emoji "🤖", gradient violet, a cote de "Apprendre"

**`src/App.tsx`** : Ajouter la route lazy-loaded `fitila/ia` pointant vers `FitilaIA`

## Details techniques

### Edge function `fitila-ia-chat/index.ts`

- Utilise `LOVABLE_API_KEY` (deja configure) pour Gemini
- Utilise la meme logique que `byt5-bariba-translate` pour les traductions internes (appel HTTP direct au Space HuggingFace avec le meme code Gradio)
- Plutot que de dupliquer le code Gradio, appelle directement l'edge function `byt5-bariba-translate` via fetch interne (`SUPABASE_URL + /functions/v1/byt5-bariba-translate`)
- System prompt Gemini : "Tu es un assistant intelligent. Reponds toujours en un seul paragraphe court et clair. Reponds en francais."
- Model : `google/gemini-2.5-flash-lite`
- Timeout global : 120s (3 appels sequentiels)

### Hooks reutilises cote client

- `useAudioRecorder` : enregistrement micro
- `useBaribaSTTWithFallback` : transcription voix bariba -> texte bariba
- Pas besoin de `useSimpleTranslation` cote client car la traduction se fait entierement en backend

### UX

- Interface epuree, fond clair comme le traducteur
- Bulles de chat : utilisateur a droite (orange), IA a gauche (violet/indigo)
- Placeholder du champ texte : "Yaa sɔ̃ɔ..." (Demandez en bariba)
- Bouton micro a cote du champ de saisie
- Le champ se vide immediatement apres envoi (meme pattern que le traducteur corrige)

## Fichiers a creer

1. `supabase/functions/fitila-ia-chat/index.ts` - Edge function pipeline complet
2. `src/pages/fitila/FitilaIA.tsx` - Page chat

## Fichiers a modifier

1. `src/pages/fitila/FitilaApp.tsx` - Ajouter entree menu "Fitila IA"
2. `src/App.tsx` - Ajouter route + lazy import
3. `supabase/config.toml` - Ajouter `[functions.fitila-ia-chat]` avec `verify_jwt = false`
