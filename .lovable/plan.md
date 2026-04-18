

# Plan : Fitila Tem IA — RAG 100% local, 0 API externe

## Réflexion sur la faisabilité "tout en local sans Lovable AI"

L'utilisateur demande deux choses qui peuvent sembler contradictoires :
1. **Pas de HuggingFace, pas de ByT5** ✅ facile (on supprime la traduction)
2. **Pas d'appel à Lovable AI Gateway** ⚠️ implique : pas de LLM génératif distant

**Conséquence importante** : sans LLM, on ne peut pas "générer" une réponse — on peut seulement **extraire** des passages. C'est en fait *parfaitement aligné* avec sa nouvelle exigence : "AGIS COMME UN EXTRACTEUR" + "NE TRADUIS RIEN". Donc on bascule vers un **moteur RAG purement extractif**, qui :
- tourne 100% dans le navigateur (zéro API, zéro coût, zéro latence réseau)
- répond en Bariba en réutilisant les phrases du document tel quel
- est ultra-performant car le corpus (207 articles, ~85 KB) tient en RAM

C'est plus rapide, plus fiable, plus respectueux de la langue source qu'un LLM qui "paraphrase".

## Architecture cible

```text
Question Bariba (UI)
   │
   ▼
[Moteur RAG client-side] ──► Index BM25 + n-grammes (préchargé au mount)
   │
   ▼
Top-K passages Bariba pertinents
   │
   ▼
Réponse extractive (1-3 phrases du doc, telles quelles)
   │  + Sources (Saria N°)
   ▼
Affichage chat
```

**Aucun appel réseau** une fois la page chargée. Le corpus JSON (déjà présent : `supabase/functions/_shared/foncier_bariba_corpus.json`) est dupliqué côté frontend.

## Implémentation

### 1. Nouveau corpus frontend (`src/data/foncierBaribaCorpus.ts`)
- Importé statiquement depuis le JSON existant (copie du shared)
- Typé `FoncierArticle[]` (id, number, content, bonu, gariWiru, page)

### 2. Moteur de recherche local (`src/lib/foncierRAG.ts`)
- **Tokenizer Bariba-aware** : NFC, lowercase, garde `ɔ ɛ ã ɔ̃ ǹ`, supprime ponctuation, filtre stop-words FR+BA
- **Index BM25** construit une seule fois au premier import (cold-start <50ms pour 207 docs)
  - Calcule TF, DF, IDF, longueur moyenne des docs
- **Bonus n-grammes** : matching de bigrammes (ex. "tem bausu") pour booster les phrases exactes
- **Bonus mention article** : si la question contient "saria 14" ou "article 14" → boost direct sur l'article 14
- **Fonction `searchFoncier(query, k=6)`** retourne `[{article, score, matchedSentences}]`

### 3. Extracteur de réponse (`extractAnswer`)
- Prend les top-K passages
- Découpe chaque `content` en phrases (split sur `.` `!` `?` `\n`)
- Score chaque phrase par recouvrement avec les tokens de la question
- Renvoie les **2-3 meilleures phrases** (concaténées avec `\n\n`) + cite les Saria d'origine
- **Si score max < seuil** → renvoie le fallback exact demandé : `"Gari yini bweseru ku wáa tem saria tire teni søø."`

### 4. Refonte de `FitilaTemIA.tsx`
- **Supprime** : `supabase.functions.invoke('fitila-tem-ia-chat')`, `supabase.functions.invoke('byt5-bariba-translate')`, bouton "Traduire en français", états `translationFr/isTranslatingFr/isFallbackFr`
- **Remplace** par appel synchrone : `const { answer, sources } = answerFromCorpus(question)`
- **Garde** : UI complète, animations, `BaribaSmartTextarea`, modal sources, micro (STT reste un service mais c'est l'input vocal — peut être désactivé si user veut vraiment 0 réseau ; on garde car déjà existant et optionnel)
- **Nouveau** : mention sous le champ : `"Posez votre question directement en Bariba — recherche 100% locale, sans Internet"`
- **Réponse instantanée** : pas de loader long, juste un effet typing pour le confort visuel

### 5. Edge function `fitila-tem-ia-chat` → conservée mais marquée deprecated
- On ne l'appelle plus depuis le client
- On ajoute un commentaire en tête expliquant qu'elle est remplacée par le moteur local
- Pas supprimée pour préserver l'historique git et permettre un rollback rapide

### 6. Suppression badge "fallback français"
- Plus de traduction → plus de fallback
- L'UI est simplifiée : juste la bulle Bariba + sources

## Performance attendue

| Métrique | Avant (RAG + Gemini + ByT5) | Après (100% local) |
|---|---|---|
| Latence réponse | 3-8 sec | **< 50 ms** |
| Coût par requête | ~$0.0001 | **$0** |
| Fonctionne offline | ❌ | **✅** |
| Risque d'hallucination | Faible | **0 (extractif pur)** |
| Respect orthographe Bariba | LLM peut altérer | **Identique au doc** |

## Garanties

- **Zéro appel externe** pour la fonctionnalité chat (le STT vocal reste optionnel et indépendant)
- **Réponses 100% extractives** — l'utilisateur voit littéralement les phrases du Code foncier
- **Caractères Bariba** (`ɔ ɛ ã ɔ̃ ǹ`) préservés à 100% car aucun LLM ne réécrit le texte
- **Fallback exact** : `"Gari yini bweseru ku wáa tem saria tire teni søø."` quand pertinence insuffisante
- **Sources toujours citées** : chaque phrase est attribuée à son Saria d'origine
- **Bundle léger** : ~85 KB de JSON gzippé ≈ 30 KB transférés une fois, mis en cache navigateur

## Fichiers

**Créés** :
- `src/data/foncierBaribaCorpus.ts` (export du corpus)
- `src/lib/foncierRAG.ts` (tokenizer + BM25 + extracteur)

**Modifiés** :
- `src/pages/fitila/FitilaTemIA.tsx` (refonte logique, UI préservée)

**Inchangés** :
- `supabase/functions/fitila-tem-ia-chat/*` (laissé en place, plus appelé)
- `BaribaSmartTextarea`, `FoncierSourcesModal` (réutilisés tels quels)

