// Comparaison visuelle entre la réponse de l'apprenant et les réponses acceptées
import { useMemo } from 'react';

interface AnswerDiffProps {
  studentAnswer: string;
  acceptedAnswers: string[];
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (s: string) => normalize(s).split(' ').filter(Boolean);

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na && !nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export default function AnswerDiff({ studentAnswer, acceptedAnswers }: AnswerDiffProps) {
  const best = useMemo(() => {
    if (!acceptedAnswers || acceptedAnswers.length === 0) {
      return { ref: '', score: 0 };
    }
    let bestRef = acceptedAnswers[0];
    let bestScore = 0;
    for (const ref of acceptedAnswers) {
      const s = similarity(studentAnswer, ref);
      if (s > bestScore) {
        bestScore = s;
        bestRef = ref;
      }
    }
    return { ref: bestRef, score: bestScore };
  }, [studentAnswer, acceptedAnswers]);

  const studentTokens = useMemo(() => tokenize(studentAnswer), [studentAnswer]);
  const refTokens = useMemo(() => tokenize(best.ref), [best.ref]);
  const refSet = useMemo(() => new Set(refTokens), [refTokens]);
  const studentSet = useMemo(() => new Set(studentTokens), [studentTokens]);

  const scorePct = Math.round(best.score * 100);
  const scoreColor =
    scorePct >= 80
      ? 'text-emerald-600 bg-emerald-50'
      : scorePct >= 50
      ? 'text-amber-600 bg-amber-50'
      : 'text-rose-600 bg-rose-50';

  if (!acceptedAnswers || acceptedAnswers.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">Aucun corrigé disponible pour comparer.</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-500 uppercase">Comparaison</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>
          Similarité {scorePct}%
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-[10px] font-bold text-gray-500 mb-1">VOTRE RÉPONSE</p>
          <p className="text-sm leading-relaxed">
            {studentTokens.length === 0 ? (
              <span className="italic text-gray-400">(vide)</span>
            ) : (
              studentTokens.map((tok, i) => (
                <span
                  key={i}
                  className={
                    refSet.has(tok)
                      ? 'text-emerald-700 bg-emerald-100 px-0.5 rounded'
                      : 'text-rose-700 bg-rose-100 px-0.5 rounded line-through'
                  }
                >
                  {tok}{' '}
                </span>
              ))
            )}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-[10px] font-bold text-emerald-700 mb-1">RÉPONSE ATTENDUE</p>
          <p className="text-sm leading-relaxed">
            {refTokens.map((tok, i) => (
              <span
                key={i}
                className={
                  studentSet.has(tok)
                    ? 'text-emerald-700'
                    : 'text-amber-700 bg-amber-100 px-0.5 rounded font-semibold'
                }
              >
                {tok}{' '}
              </span>
            ))}
          </p>
          {acceptedAnswers.length > 1 && (
            <details className="mt-2">
              <summary className="text-[10px] text-emerald-700 cursor-pointer">
                +{acceptedAnswers.length - 1} autre(s) réponse(s) acceptée(s)
              </summary>
              <ul className="mt-1 space-y-0.5">
                {acceptedAnswers
                  .filter((a) => a !== best.ref)
                  .map((a, i) => (
                    <li key={i} className="text-xs text-emerald-800">• {a}</li>
                  ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
