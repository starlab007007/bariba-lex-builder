// Corpus du Code Foncier béninois traduit en Bariba (loi n° 2013-01)
// Importé statiquement depuis supabase/functions/_shared/foncier_bariba_corpus.json
// 207 articles — utilisé par le moteur RAG 100% local (src/lib/foncierRAG.ts)

import corpusJson from './foncier_bariba_corpus.json';

export interface FoncierArticle {
  id: number;
  number: string;       // ex: "Saria 14se"
  content: string;      // texte intégral en Bariba
  bonu: string | null;  // section/partie
  baeru: string | null;
  gariWiru: string | null; // titre/livre
  page: number;
}

export const FONCIER_CORPUS: FoncierArticle[] = corpusJson as FoncierArticle[];
