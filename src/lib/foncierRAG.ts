// Moteur RAG 100% local pour Fitila Tem IA
// Aucun appel réseau — BM25 + bonus n-grammes + extraction de phrases.
// Corpus : 207 articles du Code Foncier béninois en Bariba.

import { FONCIER_CORPUS, type FoncierArticle } from '@/data/foncierBaribaCorpus';

// ──────────────────────────────────────────────────────────────────────
// Stop-words FR + BA fréquents (à ignorer dans le scoring)
// ──────────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  // FR
  'le','la','les','un','une','des','de','du','et','ou','est','sont','ce','cette','ces','que','qui','quoi','quel','quelle',
  'pour','par','sur','dans','avec','sans','au','aux','en','à','a','se','sa','son','ses','mon','ma','mes','ton','ta','tes',
  'il','elle','ils','elles','je','tu','nous','vous','on','y','ne','pas','plus','être','avoir','faire','dit','dire',
  // BA basiques (mots-outils très fréquents — à raffiner empiriquement)
  'ka','ya','ye','yè','yi','yì','ba','bà','bù','bu','wã','wãa','sɔɔ','sɔ̃','mi','mɛ','mɛ̃','tè','tì','ta','sere','ǹ','kun','tera','yera','ma','ko','koo','mɔ','mɔ̀','sãa','sãawa','niya','nu','nì','sin','si','sì','su','goo','geja',
]);

// ──────────────────────────────────────────────────────────────────────
// Tokenizer Bariba-aware
// ──────────────────────────────────────────────────────────────────────
function normalize(text: string): string {
  return text.normalize('NFC').toLowerCase();
}

function tokenize(text: string): string[] {
  const norm = normalize(text);
  // Garde lettres latines + caractères Bariba (ɔ ɛ ã ĩ ũ ɔ̃ ɛ̃ ǹ etc.) + chiffres
  const cleaned = norm.replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ');
  return cleaned
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(tokens[i] + ' ' + tokens[i + 1]);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Pré-construction de l'index BM25 (une seule fois au load du module)
// ──────────────────────────────────────────────────────────────────────
interface IndexedDoc {
  article: FoncierArticle;
  tokens: string[];
  tf: Map<string, number>;
  bigrams: Set<string>;
  length: number;
}

const K1 = 1.5;
const B = 0.75;

function buildIndex() {
  const docs: IndexedDoc[] = FONCIER_CORPUS.map(article => {
    const fullText = [article.number, article.gariWiru, article.bonu, article.content]
      .filter(Boolean).join(' ');
    const tokens = tokenize(fullText);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return {
      article,
      tokens,
      tf,
      bigrams: new Set(bigrams(tokens)),
      length: tokens.length,
    };
  });

  const df = new Map<string, number>();
  for (const d of docs) {
    for (const term of d.tf.keys()) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const N = docs.length;
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / N;
  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, Math.log(1 + (N - freq + 0.5) / (freq + 0.5)));
  }

  return { docs, idf, avgdl };
}

const INDEX = buildIndex();

// ──────────────────────────────────────────────────────────────────────
// Recherche
// ──────────────────────────────────────────────────────────────────────
export interface SearchHit {
  article: FoncierArticle;
  score: number;
}

function detectArticleMention(query: string): number | null {
  // "saria 14", "saria 14se", "article 14", "art 14"
  const m = normalize(query).match(/\b(?:saria|article|art|art\.)\s*(\d{1,3})\b/);
  if (m) return parseInt(m[1], 10);
  return null;
}

export function searchFoncier(query: string, k = 6): SearchHit[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const qBigrams = bigrams(qTokens);
  const mentioned = detectArticleMention(query);

  const hits: SearchHit[] = INDEX.docs.map(d => {
    let score = 0;
    for (const qt of qTokens) {
      const tf = d.tf.get(qt) || 0;
      if (tf === 0) continue;
      const idf = INDEX.idf.get(qt) || 0;
      const denom = tf + K1 * (1 - B + B * (d.length / INDEX.avgdl));
      score += idf * (tf * (K1 + 1)) / denom;
    }
    // Bonus bigrammes (expressions)
    for (const bg of qBigrams) {
      if (d.bigrams.has(bg)) score += 2.0;
    }
    // Bonus mention explicite d'un numéro de saria
    if (mentioned !== null && d.article.number.includes(`${mentioned}se`)) {
      score += 50;
    }
    if (mentioned !== null && d.article.id === mentioned) {
      score += 50;
    }
    return { article: d.article, score };
  });

  return hits
    .filter(h => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// ──────────────────────────────────────────────────────────────────────
// Extracteur de réponse (purement extractif)
// ──────────────────────────────────────────────────────────────────────
const FALLBACK_BA = 'Gari yini bweseru ku wáa tem saria tire teni søø.';
const SCORE_THRESHOLD = 1.2;

export interface AnswerResult {
  answer: string;
  sources: { id: number; number: string; content: string; page: number; gariWiru?: string | null }[];
  isFallback: boolean;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

function scoreSentence(sentence: string, qTokenSet: Set<string>): number {
  const tokens = tokenize(sentence);
  if (tokens.length === 0) return 0;
  let hits = 0;
  for (const t of tokens) if (qTokenSet.has(t)) hits++;
  // Score = nb de matches, légèrement normalisé pour éviter le bruit des phrases longues
  return hits + hits / Math.sqrt(tokens.length);
}

export function answerFromCorpus(query: string): AnswerResult {
  const hits = searchFoncier(query, 6);
  if (hits.length === 0 || hits[0].score < SCORE_THRESHOLD) {
    return { answer: FALLBACK_BA, sources: [], isFallback: true };
  }

  const qTokenSet = new Set(tokenize(query));

  // Récolte de phrases candidates depuis les top-K articles
  type Candidate = { sentence: string; score: number; article: FoncierArticle };
  const candidates: Candidate[] = [];
  for (const h of hits) {
    const sentences = splitSentences(h.article.content);
    for (const s of sentences) {
      const sc = scoreSentence(s, qTokenSet) * Math.log(1 + h.score);
      if (sc > 0) candidates.push({ sentence: s, score: sc, article: h.article });
    }
  }

  if (candidates.length === 0) {
    // Aucune phrase ne matche → on retourne le contenu intégral du meilleur article
    const best = hits[0].article;
    return {
      answer: best.content,
      sources: [{ id: best.id, number: best.number, content: best.content, page: best.page, gariWiru: best.gariWiru }],
      isFallback: false,
    };
  }

  candidates.sort((a, b) => b.score - a.score);

  // Top 3 phrases distinctes
  const seen = new Set<string>();
  const picked: Candidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.sentence)) continue;
    seen.add(c.sentence);
    picked.push(c);
    if (picked.length >= 3) break;
  }

  // Sources uniques (préserve l'ordre d'apparition)
  const sourceMap = new Map<number, FoncierArticle>();
  for (const p of picked) {
    if (!sourceMap.has(p.article.id)) sourceMap.set(p.article.id, p.article);
  }

  const answer = picked.map(p => p.sentence).join('\n\n');
  const sources = Array.from(sourceMap.values()).map(a => ({
    id: a.id, number: a.number, content: a.content, page: a.page, gariWiru: a.gariWiru,
  }));

  return { answer, sources, isFallback: false };
}
