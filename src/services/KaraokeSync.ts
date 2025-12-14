export interface WordTiming {
  word: string;
  start: number; // ms from start
  end: number;   // ms from start
  index: number;
}

export interface KaraokeSyncResult {
  words: WordTiming[];
  totalDuration: number;
}

/**
 * Generate word timings from transcript and audio duration
 * Uses proportional distribution based on word length
 */
export const generateWordTimings = (
  transcript: string,
  durationMs: number
): KaraokeSyncResult => {
  if (!transcript || durationMs <= 0) {
    return { words: [], totalDuration: 0 };
  }

  // Clean and split transcript into words
  const cleanedWords = transcript
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);

  if (cleanedWords.length === 0) {
    return { words: [], totalDuration: durationMs };
  }

  // Calculate total character count for proportional timing
  const totalChars = cleanedWords.reduce((sum, word) => sum + word.length, 0);
  
  // Add small gaps between words (10% of total time for pauses)
  const speakingTime = durationMs * 0.9;
  const pauseTime = durationMs * 0.1;
  const pausePerWord = pauseTime / (cleanedWords.length - 1 || 1);

  const words: WordTiming[] = [];
  let currentTime = 0;

  cleanedWords.forEach((word, index) => {
    // Duration proportional to word length
    const wordDuration = (word.length / totalChars) * speakingTime;
    
    words.push({
      word,
      start: Math.round(currentTime),
      end: Math.round(currentTime + wordDuration),
      index
    });

    currentTime += wordDuration + pausePerWord;
  });

  return {
    words,
    totalDuration: durationMs
  };
};

/**
 * Get the currently active word based on playback time
 */
export const getCurrentWordIndex = (
  words: WordTiming[],
  currentTimeMs: number
): number => {
  for (let i = words.length - 1; i >= 0; i--) {
    if (currentTimeMs >= words[i].start) {
      return i;
    }
  }
  return -1;
};

/**
 * Get word status for styling
 */
export type WordStatus = 'past' | 'active' | 'future';

export const getWordStatus = (
  word: WordTiming,
  currentTimeMs: number
): WordStatus => {
  if (currentTimeMs >= word.end) return 'past';
  if (currentTimeMs >= word.start) return 'active';
  return 'future';
};
