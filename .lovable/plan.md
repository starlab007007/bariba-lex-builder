

# Plan : Fitila Tem IA — Chatbot RAG sur le Code Foncier Bariba

## Vue d'ensemble

Créer un nouvel outil **Fitila Tem IA** : clone visuel exact de Fitila IA, mais avec une logique **RAG strict** limitée au document foncier Bariba (loi 2013-01, déjà parsé dans `src/data/foncierBaribaContent.ts` — 207 articles).

## Architecture

### 1. Navigation (FitilaApp.tsx)
Ajouter une tuile **juste après "Classe"** :
```ts
{ emoji: '⚖️', labelKey: 'sidebar_fitila_tem_ia', descKey: 'sidebar_fitila_tem_ia_desc',
  path: '/fitila/tem-ia', gradient: 'from-emerald-500 to-teal-400' }
```
Ajouter les clés de traduction FR/BA dans `FitilaLanguageContext` :
- `sidebar_fitila_tem_ia` : "Fitila Tem IA" / "Fitila Tem IA"
- `sidebar_fitila_tem_ia_desc` : "Assistant Code Foncier Bariba" / "Tem bausu sariaba sɔ̃ɔsiru"

### 2. Page (`src/pages/fitila/FitilaTemIA.tsx`)
**Clone de FitilaIA.tsx** avec adaptations :
- Header : icône ⚖️ (Scale), titre "Fitila Tem IA", sous-titre "Tem bausu sariaba"
- **Badge visible** sous le header : `🔒 Assistant basé uniquement sur le Code Foncier (Bariba)`
- Messages stockés dans un `useState` **isolé** (clé localStorage différente : `fitila-tem-ia-history`)
- Couleurs : palette emeraude/teal au lieu d'indigo/purple pour distinguer visuellement
- Réutilise : `BARIBA_CHARS`, `usePhoneticSuggestions`, `useAudioRecorder`, `useBaribaSTT`, `TypingText`, traduction ByT5
- Input invoque la nouvelle edge function : `fitila-tem-ia-chat`

### 3. Edge Function (`supabase/functions/fitila-tem-ia-chat/index.ts`)
**Approche RAG simple sans vectorisation** (les 207 articles tiennent en ~80 KB de texte → cabable d'être passé en contexte directement, ou pré-filtré par mots-clés) :

**Étape 1 — Récupération (retrieval)** :
- Charger le corpus depuis un fichier embarqué `_shared/foncier_bariba_corpus.json` (généré depuis `foncierBaribaContent.ts`)
- Tokenizer la question utilisateur, normaliser (NFC, lowercase, strip ponctuation)
- **Scoring BM25-like simple** sur tous les articles : compter occurrences des mots-clés non-stop dans `content + bonu + gariWiru`
- Sélectionner **top 8 articles** les plus pertinents (≈ 4-6 KB de contexte)

**Étape 2 — Génération (LLM)** :
- Modèle : `google/gemini-2.5-flash` (équilibre qualité/coût)
- System prompt strict (cf. demande utilisateur, repris mot pour mot)
- User prompt : `[CONTEXTE]\n${top8_articles}\n\n[QUESTION]\n${userMsg}`
- Si aucun article ne dépasse un seuil de pertinence → réponse forcée "Désolé, je ne trouve pas cette information dans le document foncier Bariba fourni."

**Étape 3 — Format de réponse** :
- Même contrat que `fitila-ia-chat` : `{ response_ba, response_fr, fallback, model, sources }`
- Ajout : tableau `sources: [{ id, number, page }]` listant les articles cités → affiché en pied de bulle dans l'UI ("📖 Saria 14se, Saria 27se")

### 4. Préparation des données (script one-shot)
Script `/tmp/build_foncier_corpus.py` :
- Lit `src/data/foncierBaribaContent.ts`
- Applique le `bariba_mapping` une seconde fois (sécurité — déjà appliqué lors de la génération, mais idempotent)
- Écrit `supabase/functions/_shared/foncier_bariba_corpus.json` (article-id → texte normalisé + métadonnées)
- Ce fichier est importé en Deno via `import corpus from "../_shared/foncier_bariba_corpus.json" with { type: "json" }`

### 5. Affichage des sources dans la bulle
Sous chaque réponse de l'assistant, petite carte cliquable :
```
📖 Sources : Saria 14se · Saria 27se · Saria 81se
```
Cliquer ouvre un modal avec le texte intégral des articles cités.

## Fichiers à créer / modifier

**Créés** :
- `src/pages/fitila/FitilaTemIA.tsx` (clone adapté)
- `supabase/functions/fitila-tem-ia-chat/index.ts` (edge RAG)
- `supabase/functions/_shared/foncier_bariba_corpus.json` (corpus pré-traité)
- `src/components/fitila/FoncierSourcesModal.tsx` (visualisation des articles cités)

**Modifiés** :
- `src/App.tsx` → route `<Route path="tem-ia" element={<FitilaTemIA />} />`
- `src/pages/fitila/FitilaApp.tsx` → nouvelle tuile après "Classe"
- `src/contexts/FitilaLanguageContext.tsx` → 2 nouvelles clés i18n FR/BA

## Garanties

- **Zéro hallucination** : prompt strict + fallback explicite si aucune source pertinente
- **Caractères Bariba corrects** : mapping appliqué au build du corpus
- **Isolation totale** : historique séparé en localStorage, edge function dédiée, état React indépendant
- **Économique** : pas de service de vectorisation externe — retrieval simple suffit pour 207 articles
- **Transparent** : sources affichées sous chaque réponse pour auditer la provenance

