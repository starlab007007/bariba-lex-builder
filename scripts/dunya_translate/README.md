# Traduction FR ↔ Baatɔnum : pipeline « corpus d'or → mémoire → ByT5 renforcé »

Objectif : une traduction **exacte quand la phrase est attestée**, **mesurée** quand elle est nouvelle,
et **honnête** (confiance réelle, pas un chiffre fixe) quand le système n'est pas sûr.

```
dictionnaire + Apprendre + scènes + exercices + Classe N2
        │  build_corpus.py   normalisation, nettoyage OCR, porte de qualité, grades A/B, split sans fuite
        ▼
data/translation/  parallel.jsonl  glossary.json  gold_candidates.jsonl  gold_review.csv  to_validate.jsonl
        │                                  │
        │ export_memory.py                 │ make_training_data.py  (indices mémoire + glossaire, contexte, multitâche)
        ▼                                  ▼
  mémoire exacte (app + edge function)    train_byt5.py  →  mine_hard_examples.py  →  dpo.py   (renforcement)
                                           │
                                           ▼  eval_translation.py  (chrF++, exact, mots connus, boucles)
```

## Ce que chaque ressource apporte

| Ressource | Rôle |
|---|---|
| Dictionnaire (exemples) | paires de phrases ; mots → glossaire |
| Apprendre – cartes | mots, pluriel, forme d'insistance, classe, thème ; **phrases à trous** (`fill:`), **pluriel** (`ba-pl:`), **insistance** (`ba-foc:`) |
| Apprendre – scènes / Scènes v2 | dialogues avec lieu, rôles et réplique précédente → **contexte** |
| Apprendre – proverbes, fondations | paires attestées avec page du dictionnaire |
| Exercices + quiz | **mauvaises réponses écrites par des humains** → préférences DPO |
| Classe (voix, leçons, foncier) | baatɔnum seul → rétro-traduction, vocabulaire |
| Classe N2 | paires utilisées seulement si les mots sont connus du dictionnaire (sinon file de validation) |

## Utilisation

```bash
python build_corpus.py          # régénère data/translation/*
python export_memory.py         # app (dunya_memory.json) + fonction (translation-memory.ts)
python make_training_data.py    # data/translation/training/{train,dev,test}.jsonl
python -m unittest -v test_pipeline
python eval_translation.py --backend memory                 # plancher mesuré
python eval_translation.py --backend space --limit 120      # vrai modèle (internet)
```

Entraînement (GPU, p. ex. Kaggle T4 gratuit) :

```bash
python train_byt5.py --model zimesongbian/modele_byt5_bariba_expert_api_v03_improve --out out/v04 --epochs 4 --lr 1e-4
python mine_hard_examples.py --model out/v04 --samples 6        # exemples difficiles + négatifs auto-générés
python dpo.py --model out/v04 --out out/v04-dpo                 # préférences : références vs fausses réponses
python eval_translation.py --backend hf --model out/v04-dpo --rag
```

## Validation humaine (le levier le plus important)

- `data/translation/gold_review.csv` : ~500 phrases à faire relire par des enseignants de Classe
  (colonne *référence correcte O/N* + correction). C'est la mesure officielle de « naturel et exact ».
- `data/translation/to_validate.jsonl` : paires écartées (placeholders du dictionnaire, mauvais alignements,
  scènes « a_valider », textes Classe N2 aux mots inconnus), avec la raison.

Format d'entrée du modèle : voir `dunya_text.build_input` (`fr-ba: texte || ctx: … || mem: … || dic: …`).
Les indices sont facultatifs : `fr-ba: texte` seul reste valide (compatible v03).
