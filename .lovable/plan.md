

# Amelioration de la qualite des traductions et transcriptions Bariba

## Objectif

Creer un systeme de post-traitement intelligent qui ameliore la qualite, la naturalite et la precision des traductions (FR-BA, BA-FR) et des transcriptions (STT Bariba) avant de les afficher a l'utilisateur.

## Architecture de la solution

L'approche repose sur **deux piliers** :

1. **Une base de connaissances linguistiques** compilee a partir des fichiers fournis et du guide architectural, stockee dans des fichiers de donnees statiques et injectee dans les prompts IA
2. **Une edge function de post-traitement** (`refine-bariba`) qui recoit le resultat brut des modeles existants (ByT5, Lovable AI, HuggingFace STT) et le raffine en utilisant Lovable AI (Gemini) avec un prompt systeme enrichi de toute la connaissance linguistique Bariba

## Flux de donnees

```text
[Modele ByT5 / Lovable AI]     [Modele STT HuggingFace]
        |                              |
        v                              v
   Traduction brute              Transcription brute
        |                              |
        +----------- Filtre -----------+
                       |
                       v
           [Edge Function: refine-bariba]
           (Lovable AI + Connaissance linguistique)
                       |
                       v
              Resultat raffine, naturel
                       |
                       v
               Affichage utilisateur
```

---

## Partie 1 : Base de connaissances linguistiques

### Fichier a creer : `src/data/baribaLinguisticKnowledge.ts`

Ce fichier compile toute la connaissance extraite des documents fournis en un objet structurel exportable, utilisable a la fois :
- Par l'edge function de raffinage (injecte dans le prompt systeme)
- Par le module "Connaissances Fondamentales" (deja existant dans `learningFoundations.ts`, a enrichir)

**Contenu du fichier :**

1. **Regles grammaticales cles** (extraites du guide architectural fourni)
   - Ordre SOV (Sujet-Objet-Verbe)
   - Classes nominales (humain: U/Ba, non-humain: Ga/Mu)
   - Systeme verbal (pas de conjugaison, particules TAM: koo=futur, ra=habituel, -mo=progressif)
   - Negation (n, kun, ku entre sujet et verbe)
   - Postpositions (soo = dans, yen so = a cause de)
   - Adjectifs apres le nom
   - Tonalite (3 tons: Haut, Moyen, Bas)

2. **Table des pronoms complete**
   - Sujet: Na, A, U, Ga/Mu, Sa, I, Ba
   - Objet: Man, Nun, Sun, Bee, Bu
   - Possessif: Nen, Wunen, Win, Sun, Been, Ben

3. **Expressions idiomatiques** (69 idiomes du fichier `idiomes-3.json`)
   - Salutations, emotions, etats, verbes figes, proverbes, connecteurs

4. **Corpus d'exemples de reference** (selection de ~200 paires FR-BA les plus representatives des 78K+ et 36K+ entrees)
   - Phrases courantes, structures SOV, negations, questions, imperatives

### Fichier a enrichir : `src/data/learningFoundations.ts`

Ajouter **2 nouvelles lecons** aux connaissances fondamentales :

- **Leon 8 : "Expressions & Idiomes"** — les 69 idiomes du fichier fourni, organises par categorie (Salutations, Emotions, Etats, Actions, Religion, Proverbes, Famille)
- **Leon 9 : "Vocabulaire Essentiel"** — mots de base extraits du dictionnaire et du corpus (corps, famille, nourriture, nature, nombres composes, jours)

---

## Partie 2 : Edge Function de raffinage

### Fichier a creer : `supabase/functions/refine-bariba/index.ts`

Cette fonction recoit un resultat brut (traduction ou transcription) et le raffine en utilisant Lovable AI avec un prompt systeme massif contenant toute la connaissance linguistique.

**Input :**
```typescript
{
  text: string;           // Texte brut a raffiner
  type: 'translation' | 'transcription';
  direction?: 'fr-ba' | 'ba-fr';  // Pour les traductions
  originalInput?: string; // Texte source original (pour contexte)
}
```

**Output :**
```typescript
{
  refined: string;        // Texte raffine
  changes: string[];      // Liste des corrections appliquees
  confidence: number;     // Score de confiance du raffinage
}
```

**Prompt systeme :** Un prompt de ~2000 tokens contenant :
- Les regles grammaticales SOV, pronoms, classes nominales, tons
- Les 69 expressions idiomatiques comme exemples de reference
- 50 paires de traduction de reference (les plus courantes)
- Instructions specifiques : "Corrige les erreurs de pronoms (U vs Ga/Mu), verifie l'ordre SOV, remplace les calques du francais par des formulations idiomatiques Bariba, utilise les postpositions correctement, assure la coherence des classes nominales"
- Pour les transcriptions : "Corrige les fautes de segmentation des mots, normalise les diacritiques (o vs oo, e vs ee, a vs aa), verifie les tons marques"

**Logique :** Appel non-streaming a Lovable AI (Gemini 2.5 Flash) avec temperature 0.2 pour maximiser la precision.

---

## Partie 3 : Integration dans les pipelines existants

### Modification : `supabase/functions/byt5-bariba-translate/index.ts`

Apres avoir obtenu la traduction brute de ByT5 (ou du fallback Lovable AI), appeler `refine-bariba` pour raffiner le resultat avant de le retourner au client.

```text
ByT5 → traduction brute → refine-bariba → traduction raffinee → retour client
```

Le raffinage est optionnel et non-bloquant : si `refine-bariba` echoue ou prend trop de temps (>5s), le resultat brut est retourne tel quel.

### Modification : `supabase/functions/bariba-stt/index.ts`

Apres avoir obtenu la transcription brute du Space HuggingFace, appeler `refine-bariba` pour nettoyer et normaliser le texte avant de le retourner.

```text
HF Space → transcription brute → refine-bariba → transcription nettoyee → retour client
```

### Modification : `src/hooks/useSimpleTranslation.ts`

Pas de changement cote client : le raffinage se fait entierement cote serveur (edge functions). Le client recoit directement le resultat raffine.

---

## Partie 4 : Enrichissement du module "Apprendre"

### Modification : `src/data/learningFoundations.ts`

Ajouter les 2 nouvelles lecons mentionnees (Expressions & Idiomes + Vocabulaire Essentiel) en suivant la structure `FoundationLesson` existante, avec :
- Sections avec tables et exemples
- Quiz de 3 questions par lecon
- Textes bilingues (fr + br)

---

## Fichiers a creer / modifier

| Action | Fichier | Description |
|---|---|---|
| Creer | `src/data/baribaLinguisticKnowledge.ts` | Base de connaissances linguistiques compilee |
| Creer | `supabase/functions/refine-bariba/index.ts` | Edge function de post-traitement IA |
| Modifier | `supabase/functions/byt5-bariba-translate/index.ts` | Appeler refine-bariba apres traduction brute |
| Modifier | `supabase/functions/bariba-stt/index.ts` | Appeler refine-bariba apres transcription brute |
| Modifier | `src/data/learningFoundations.ts` | Ajouter 2 nouvelles lecons (Idiomes + Vocabulaire) |
| Copier | `public/data/idiomes.json` | Copier idiomes-3.json dans le projet |
| Copier | `public/data/corpus_reference.json` | Selection de paires de reference du corpus |

---

## Section technique detaillee

### Prompt systeme pour `refine-bariba` (resume)

```
Tu es un expert linguiste en langue Bariba (Baatonum).

REGLES GRAMMATICALES BARIBA :
- Ordre : SOV (Sujet-Objet-Verbe). Ex: "Na koko di" = Je riz mange
- Pronoms sujet : Na(je), A(tu), U(il humain), Ga/Mu(il chose), Sa(nous), I(vous), Ba(ils)
- Pronoms possessifs : Nen(mon), Wunen(ton), Win(son), Sun(notre), Been(votre), Ben(leur)
- Classes nominales : -bu/-mbu(humain pl.), a-/y-(anime sg.), m-(inanime), -nu/-su(collectif)
- Temps : rien(passe), koo(futur), ra(habituel), -mo(progressif)
- Negation : n/kun/ku entre sujet et verbe
- Postpositions : soo(dans), yen so(a cause de)
- Adjectifs APRES le nom
- "Etre" = waa, "Avoir" = mo

IDIOMES DE REFERENCE :
[69 expressions idiomatiques injectees]

PAIRES DE TRADUCTION DE REFERENCE :
[50 paires les plus courantes]

TACHE :
Reçois un texte [traduit/transcrit] et ameliore-le :
1. Corrige l'ordre des mots (SOV)
2. Verifie pronoms et classes nominales
3. Remplace calques francais par formulations idiomatiques
4. Normalise diacritiques et tons
5. Retourne UNIQUEMENT le texte corrige, sans explication
```

### Gestion du timeout

L'appel a `refine-bariba` depuis `byt5-bariba-translate` et `bariba-stt` utilise un timeout de 5 secondes. Si depasse, le resultat brut est retourne avec un flag `refined: false` dans les metadonnees.

### Impact sur la latence

- Traduction actuelle : ~3-8s (ByT5) ou ~2s (Lovable AI)
- Avec raffinage : +1-2s supplementaires
- Total : ~4-10s — acceptable pour une meilleure qualite

