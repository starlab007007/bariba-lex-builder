/**
 * Statistical Machine Translation Engine
 * Implements SMT with Phrase Table, N-gram LM, Word Alignment, Beam Search
 * Optimized for 80k+ French-Bariba training pairs
 */

interface TrainingPair {
  french: string;
  bariba: string;
  quality_score?: number;
}

interface TranslationResult {
  translation: string;
  confidence: number;
  alternatives: string[];
  phraseScore: number;
  lmScore: number;
  alignmentScore: number;
}

interface PhraseTableEntry {
  target: string;
  probability: number;
  count: number;
}

export class StatisticalTranslationEngine {
  private phraseTable: Map<string, PhraseTableEntry[]> = new Map();
  private languageModel: Map<string, number> = new Map();
  private wordAlignment: Map<string, Map<string, number>> = new Map();
  private trigramCounts: Map<string, number> = new Map();
  private fourgramCounts: Map<string, number> = new Map();
  private baribaWordFreq: Map<string, number> = new Map();
  private isInitialized = false;

  /**
   * Initialize and train the SMT engine
   */
  async initialize(trainingPairs: TrainingPair[]): Promise<void> {
    console.log('🚀 Initializing Statistical Translation Engine...');
    console.log(`📊 Training data: ${trainingPairs.length} pairs`);
    
    const startTime = Date.now();

    // Build all models in parallel for speed
    await Promise.all([
      this.buildPhraseTable(trainingPairs),
      this.buildLanguageModel(trainingPairs),
      this.trainWordAlignment(trainingPairs)
    ]);

    this.isInitialized = true;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Engine initialized in ${duration}s`);
  }

  /**
   * Build phrase translation table with n-grams (1-7 words)
   */
  private async buildPhraseTable(pairs: TrainingPair[]): Promise<void> {
    console.log('📖 Building phrase translation table...');
    const phraseCounts = new Map<string, Map<string, number>>();

    for (const pair of pairs) {
      const frenchWords = this.tokenize(pair.french);
      const baribaWords = this.tokenize(pair.bariba);

      // Extract n-grams from 1 to 7 words (BALANCE: 7 max for speed)
      for (let n = 1; n <= Math.min(7, frenchWords.length); n++) {
        for (let i = 0; i <= frenchWords.length - n; i++) {
          const frPhrase = frenchWords.slice(i, i + n).join(' ');
          
          // Try to find corresponding Bariba segment
          for (let m = 1; m <= Math.min(7, baribaWords.length); m++) {
            for (let j = 0; j <= baribaWords.length - m; j++) {
              const bbaPhrase = baribaWords.slice(j, j + m).join(' ');
              
              if (!phraseCounts.has(frPhrase)) {
                phraseCounts.set(frPhrase, new Map());
              }
              const bbaMap = phraseCounts.get(frPhrase)!;
              bbaMap.set(bbaPhrase, (bbaMap.get(bbaPhrase) || 0) + 1);
            }
          }
        }
      }
    }

    // Calculate probabilities with Laplace smoothing
    for (const [frPhrase, bbaCounts] of phraseCounts.entries()) {
      const total = Array.from(bbaCounts.values()).reduce((a, b) => a + b, 0);
      const entries: PhraseTableEntry[] = [];

      for (const [bbaPhrase, count] of bbaCounts.entries()) {
        // Laplace smoothing: (count + 1) / (total + vocabulary_size)
        const probability = (count + 1) / (total + bbaCounts.size);
        if (probability > 0.01) { // Filter low-probability entries
          entries.push({ target: bbaPhrase, probability, count });
        }
      }

      // Keep top 5 translations per source phrase (BALANCE optimization)
      entries.sort((a, b) => b.probability - a.probability);
      this.phraseTable.set(frPhrase, entries.slice(0, 5));
    }

    console.log(`  ✓ Phrase table: ${this.phraseTable.size} entries`);
  }

  /**
   * Build n-gram language model (trigrams + 4-grams)
   */
  private async buildLanguageModel(pairs: TrainingPair[]): Promise<void> {
    console.log('📚 Building n-gram language model...');

    for (const pair of pairs) {
      const words = this.tokenize(pair.bariba);
      
      // Count word frequencies
      for (const word of words) {
        this.baribaWordFreq.set(word, (this.baribaWordFreq.get(word) || 0) + 1);
      }

      // Trigrams: P(w3 | w1, w2)
      for (let i = 2; i < words.length; i++) {
        const trigram = `${words[i-2]} ${words[i-1]} ${words[i]}`;
        this.trigramCounts.set(trigram, (this.trigramCounts.get(trigram) || 0) + 1);
      }

      // 4-grams: P(w4 | w1, w2, w3) - BALANCE: not 5-grams for speed
      for (let i = 3; i < words.length; i++) {
        const fourgram = `${words[i-3]} ${words[i-2]} ${words[i-1]} ${words[i]}`;
        this.fourgramCounts.set(fourgram, (this.fourgramCounts.get(fourgram) || 0) + 1);
      }
    }

    // Apply Kneser-Ney smoothing
    this.applyKneserNeySmoothing();

    console.log(`  ✓ Language model: ${this.languageModel.size} n-grams`);
  }

  /**
   * Apply Kneser-Ney smoothing for better handling of rare words
   */
  private applyKneserNeySmoothing(): void {
    const discount = 0.75; // Standard discount factor

    // Smooth trigrams
    for (const [trigram, count] of this.trigramCounts.entries()) {
      const words = trigram.split(' ');
      const context = `${words[0]} ${words[1]}`;
      const contextCount = Array.from(this.trigramCounts.entries())
        .filter(([t]) => t.startsWith(context))
        .reduce((sum, [, c]) => sum + c, 0);
      
      const probability = Math.max(count - discount, 0) / contextCount;
      this.languageModel.set(trigram, probability);
    }

    // Smooth 4-grams
    for (const [fourgram, count] of this.fourgramCounts.entries()) {
      const words = fourgram.split(' ');
      const context = `${words[0]} ${words[1]} ${words[2]}`;
      const contextCount = Array.from(this.fourgramCounts.entries())
        .filter(([f]) => f.startsWith(context))
        .reduce((sum, [, c]) => sum + c, 0);
      
      const probability = Math.max(count - discount, 0) / contextCount;
      this.languageModel.set(fourgram, probability);
    }
  }

  /**
   * Train word alignment using simplified IBM Model 1
   */
  private async trainWordAlignment(pairs: TrainingPair[]): Promise<void> {
    console.log('🔗 Training word alignment (IBM Model 1)...');

    // Initialize uniform distribution
    const vocabFr = new Set<string>();
    const vocabBba = new Set<string>();

    for (const pair of pairs) {
      this.tokenize(pair.french).forEach(w => vocabFr.add(w));
      this.tokenize(pair.bariba).forEach(w => vocabBba.add(w));
    }

    // EM algorithm - 10 iterations (BALANCE: not 15 for speed)
    for (let iter = 0; iter < 10; iter++) {
      const counts = new Map<string, Map<string, number>>();
      const totals = new Map<string, number>();

      // E-step: Estimate alignment probabilities
      for (const pair of pairs) {
        const frWords = this.tokenize(pair.french);
        const bbaWords = this.tokenize(pair.bariba);

        for (const bbaWord of bbaWords) {
          let sum = 0;
          const probs = new Map<string, number>();

          for (const frWord of frWords) {
            const prob = this.getAlignment(frWord, bbaWord) || (1 / vocabBba.size);
            probs.set(frWord, prob);
            sum += prob;
          }

          for (const [frWord, prob] of probs.entries()) {
            const normalized = prob / sum;
            
            if (!counts.has(frWord)) counts.set(frWord, new Map());
            const bbaMap = counts.get(frWord)!;
            bbaMap.set(bbaWord, (bbaMap.get(bbaWord) || 0) + normalized);
            
            totals.set(frWord, (totals.get(frWord) || 0) + normalized);
          }
        }
      }

      // M-step: Update alignment probabilities
      for (const [frWord, bbaMap] of counts.entries()) {
        const total = totals.get(frWord) || 1;
        const alignments = new Map<string, number>();
        
        for (const [bbaWord, count] of bbaMap.entries()) {
          alignments.set(bbaWord, count / total);
        }
        
        this.wordAlignment.set(frWord, alignments);
      }
    }

    console.log(`  ✓ Word alignment: ${this.wordAlignment.size} alignments`);
  }

  /**
   * Translate using Enhanced Beam Search
   */
  translate(text: string, beamSize: number = 12): TranslationResult {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    const frenchWords = this.tokenize(text);
    const candidates = this.beamSearch(frenchWords, beamSize);

    if (candidates.length === 0) {
      return {
        translation: '',
        confidence: 0,
        alternatives: [],
        phraseScore: 0,
        lmScore: 0,
        alignmentScore: 0
      };
    }

    return {
      translation: candidates[0].translation,
      confidence: candidates[0].score * 100,
      alternatives: candidates.slice(1, 4).map(c => c.translation),
      phraseScore: candidates[0].phraseScore,
      lmScore: candidates[0].lmScore,
      alignmentScore: candidates[0].alignmentScore
    };
  }

  /**
   * Beam Search decoder with dynamic restructuring
   */
  private beamSearch(frenchWords: string[], beamSize: number): Array<{
    translation: string;
    score: number;
    phraseScore: number;
    lmScore: number;
    alignmentScore: number;
  }> {
    const candidates: Array<{
      translation: string;
      score: number;
      phraseScore: number;
      lmScore: number;
      alignmentScore: number;
    }> = [];

    // Generate multiple translation candidates
    for (let beam = 0; beam < beamSize; beam++) {
      const baribaWords: string[] = [];
      let phraseScore = 0;
      let alignmentScore = 0;

      let i = 0;
      while (i < frenchWords.length) {
        let bestMatch: { phrase: string; length: number; score: number } | null = null;

        // Try longest phrase first (7 down to 1)
        for (let len = Math.min(7, frenchWords.length - i); len >= 1; len--) {
          const frPhrase = frenchWords.slice(i, i + len).join(' ');
          const entries = this.phraseTable.get(frPhrase);

          if (entries && entries.length > 0) {
            // Pick different candidates for diversity
            const idx = Math.min(beam % entries.length, entries.length - 1);
            const entry = entries[idx];
            
            if (!bestMatch || entry.probability > bestMatch.score) {
              bestMatch = { phrase: entry.target, length: len, score: entry.probability };
            }
          }
        }

        if (bestMatch) {
          baribaWords.push(...bestMatch.phrase.split(' '));
          phraseScore += Math.log(bestMatch.score + 1e-10);
          i += bestMatch.length;
        } else {
          // Fallback: word-level alignment
          const frWord = frenchWords[i];
          const alignments = this.wordAlignment.get(frWord);
          
          if (alignments && alignments.size > 0) {
            const sorted = Array.from(alignments.entries()).sort((a, b) => b[1] - a[1]);
            const idx = Math.min(beam % sorted.length, sorted.length - 1);
            baribaWords.push(sorted[idx][0]);
            alignmentScore += Math.log(sorted[idx][1] + 1e-10);
          } else {
            baribaWords.push(frWord); // Keep original if no translation
          }
          i++;
        }
      }

      // Calculate language model score
      const translation = baribaWords.join(' ');
      const lmScore = this.scoreLanguageModel(baribaWords);

      // Combined score (BALANCE: 40% phrase, 40% LM, 20% alignment)
      const totalScore = 0.4 * phraseScore + 0.4 * lmScore + 0.2 * alignmentScore;

      candidates.push({
        translation,
        score: Math.exp(totalScore), // Convert log-prob back to probability
        phraseScore,
        lmScore,
        alignmentScore
      });
    }

    // Sort by score and return
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /**
   * Score translation using language model
   */
  private scoreLanguageModel(words: string[]): number {
    let score = 0;
    let count = 0;

    // Score with 4-grams
    for (let i = 3; i < words.length; i++) {
      const fourgram = `${words[i-3]} ${words[i-2]} ${words[i-1]} ${words[i]}`;
      const prob = this.languageModel.get(fourgram);
      if (prob) {
        score += Math.log(prob + 1e-10);
        count++;
      }
    }

    // Score with trigrams
    for (let i = 2; i < words.length; i++) {
      const trigram = `${words[i-2]} ${words[i-1]} ${words[i]}`;
      const prob = this.languageModel.get(trigram);
      if (prob) {
        score += Math.log(prob + 1e-10);
        count++;
      }
    }

    return count > 0 ? score / count : -10;
  }

  /**
   * Get word alignment probability
   */
  private getAlignment(frenchWord: string, baribaWord: string): number | undefined {
    return this.wordAlignment.get(frenchWord)?.get(baribaWord);
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,!?;:()]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  /**
   * Calculate Jensen-Shannon Divergence for data filtering
   */
  calculateJSD(text1: string, text2: string): number {
    const words1 = this.tokenize(text1);
    const words2 = this.tokenize(text2);

    const vocab = new Set([...words1, ...words2]);
    const dist1 = new Map<string, number>();
    const dist2 = new Map<string, number>();

    // Calculate distributions
    words1.forEach(w => dist1.set(w, (dist1.get(w) || 0) + 1));
    words2.forEach(w => dist2.set(w, (dist2.get(w) || 0) + 1));

    const total1 = words1.length;
    const total2 = words2.length;

    // Normalize
    dist1.forEach((count, word) => dist1.set(word, count / total1));
    dist2.forEach((count, word) => dist2.set(word, count / total2));

    // Calculate JSD
    let jsd = 0;
    for (const word of vocab) {
      const p = dist1.get(word) || 0;
      const q = dist2.get(word) || 0;
      const m = (p + q) / 2;

      if (p > 0) jsd += p * Math.log2(p / m);
      if (q > 0) jsd += q * Math.log2(q / m);
    }

    return jsd / 2;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const statisticalEngine = new StatisticalTranslationEngine();
