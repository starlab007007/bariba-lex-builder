import { useMemo } from 'react';

const BARIBA_NORMALIZATION: Record<string, string> = {
  'ɔ': 'o', 'Ɔ': 'O',
  'ɛ': 'e', 'Ɛ': 'E',
  'ŋ': 'n', 'Ŋ': 'N',
  'ã': 'a', 'Ã': 'A',
  'ĩ': 'i', 'Ĩ': 'I',
  'ũ': 'u', 'Ũ': 'U',
};

function normalize(word: string): string {
  let result = word;
  for (const [char, replacement] of Object.entries(BARIBA_NORMALIZATION)) {
    result = result.split(char).join(replacement);
  }
  return result.toLowerCase();
}

function score(word: string, partial: string): number {
  const lowerWord = word.toLowerCase();
  const lowerPartial = partial.toLowerCase();
  const normWord = normalize(word);
  const normPartial = normalize(partial);

  if (lowerWord === lowerPartial) return 3;
  if (lowerWord.startsWith(lowerPartial)) return 2;
  if (normWord.startsWith(normPartial)) return 1;
  if (lowerWord.includes(lowerPartial)) return 0.5;
  return 0;
}

export function useAdvancedPhonetics(partial: string, history: string[]): string[] {
  return useMemo(() => {
    if (!partial || partial.length < 1 || history.length === 0) return [];

    return history
      .map(word => ({ word, score: score(word, partial) }))
      .filter(item => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.word.length - b.word.length;
      })
      .slice(0, 5)
      .map(item => item.word);
  }, [partial, history]);
}