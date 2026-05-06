## Problème

Le build Docker échoue car `.dockerignore` exclut le dossier `supabase/`, ce qui rend le fichier `supabase/functions/_shared/foncier_bariba_corpus.json` inaccessible pendant le build.

## Solution

1. **Copier le fichier JSON** `supabase/functions/_shared/foncier_bariba_corpus.json` vers `src/data/foncier_bariba_corpus.json` (là où il est consommé).

2. **Mettre à jour l'import** dans `src/data/foncierBaribaCorpus.ts` :
   - Ancien : `import corpusJson from '../../supabase/functions/_shared/foncier_bariba_corpus.json'`
   - Nouveau : `import corpusJson from './foncier_bariba_corpus.json'`

Le fichier reste aussi dans `supabase/functions/_shared/` pour les edge functions qui en ont besoin. Aucun autre changement nécessaire.
