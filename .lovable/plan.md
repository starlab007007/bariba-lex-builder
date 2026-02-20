

# Diagnostic et Corrections - Fitila IA + Traducteur

## Bugs critiques identifiés

### Bug 1 (CRITIQUE) - Fitila IA : Reponses cassees - le frontend et le backend ne parlent pas le meme langage

Le frontend (`FitilaIA.tsx`) attend les champs `response_ba`, `response_fr` et `fallback` dans la reponse, mais le backend (`fitila-ia-chat/index.ts`) renvoie `reply`, `text`, `language`. Resultat : **chaque reponse affiche "Goo toore..." au lieu du vrai contenu**.

- Frontend lit : `data?.response_ba` et `data?.response_fr` --> toujours `undefined`
- Le texte affiche donc le fallback statique `'Gɔɔ tɔɔrɛ...'`

### Bug 2 (CRITIQUE) - Fitila IA : Pas de pipeline de traduction ByT5

Le systeme devrait fonctionner ainsi :
1. L'utilisateur pose une question (en bariba ou francais)
2. Le LLM (GPT-5-nano) genere une reponse en **francais**
3. La reponse est traduite en **bariba** via ByT5

Actuellement, le backend demande au LLM de repondre directement en bariba (ce qu'il ne sait pas faire), puis utilise `refine-bariba` (un simple raffinage, pas une traduction complete). C'est pourquoi les reponses arrivent souvent en francais.

### Bug 3 - Fitila IA : Modele code en dur

`callLovableChat` utilise toujours `google/gemini-2.5-flash` au lieu du fallback multi-modele (`openai/gpt-5-nano` en priorite) qui avait ete demande.

### Bug 4 - Fitila IA : max_tokens trop eleve

Le `max_tokens` par defaut est 800, mais devrait etre ~120 pour que la traduction ByT5 ne timeout pas.

### Traducteur (PhraseTranslator) : OK

Le traducteur utilise correctement `useSimpleTranslation` --> `ByT5TranslationService` --> edge function `byt5-bariba-translate`. Le pipeline est stable.

---

## Plan de correction

### Etape 1 : Refondre `fitila-ia-chat/index.ts`

Implementer le vrai pipeline :

```text
[Question utilisateur]
        |
        v
[GPT-5-nano genere reponse FR]  (fallback: gemini-flash-lite, gemini-flash, gpt-5-mini)
        |
        v
[ByT5 traduit FR --> Bariba]  (via appel interne a byt5-bariba-translate)
        |
        v
[Retourne { response_ba, response_fr, fallback }]
```

- Modele principal : `openai/gpt-5-nano` avec fallback multi-modele
- System prompt : forcer la reponse en francais (2 paragraphes, max 50 mots)
- max_tokens : 120
- Appeler `byt5-bariba-translate` (pas juste refine-bariba) pour la traduction finale
- Si ByT5 echoue : retourner `{ response_ba: null, response_fr: "...", fallback: true }`
- Si ByT5 reussit : retourner `{ response_ba: "...", response_fr: "...", fallback: false }`

### Etape 2 : Verifier `FitilaIA.tsx`

Le frontend est deja code pour lire `response_ba`, `response_fr`, `fallback`. Il suffit de s'assurer que le backend renvoie ces champs. Aucune modification frontend necessaire.

### Etape 3 : Deployer et tester

- Deployer `fitila-ia-chat`
- Tester avec un message simple pour verifier que la reponse arrive en bariba
- Verifier le fallback francais en cas de timeout ByT5

---

## Details techniques

### Modifications dans `fitila-ia-chat/index.ts` :

1. Remplacer `callLovableChat` pour supporter le fallback multi-modele (`modelsToTry` array avec boucle)
2. Changer le system prompt : "Reponds TOUJOURS en francais, maximum 3 phrases courtes, 50 mots max"
3. Ajouter une fonction `translateViaByT5` qui appelle l'edge function `byt5-bariba-translate` en interne
4. Restructurer la reponse finale pour renvoyer `{ response_ba, response_fr, fallback, duration, model }`
5. Supprimer la logique `refine-bariba` (la traduction ByT5 inclut deja le post-raffinage)
6. Mettre `max_tokens: 120` par defaut

### Aucune modification necessaire :
- `FitilaIA.tsx` (frontend) - deja compatible
- `byt5-bariba-translate/index.ts` - fonctionne correctement
- `PhraseTranslator.tsx` - traducteur stable

