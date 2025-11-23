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
  // FR→BBA direction
  private phraseTableFrBba: Map<string, PhraseTableEntry[]> = new Map();
  private languageModelBba: Map<string, number> = new Map();
  private wordAlignmentFrBba: Map<string, Map<string, number>> = new Map();
  private trigramCountsBba: Map<string, number> = new Map();
  private fourgramCountsBba: Map<string, number> = new Map();
  private baribaWordFreq: Map<string, number> = new Map();
  
  // BBA→FR direction (inverted)
  private phraseTableBbaFr: Map<string, PhraseTableEntry[]> = new Map();
  private languageModelFr: Map<string, number> = new Map();
  private wordAlignmentBbaFr: Map<string, Map<string, number>> = new Map();
  private trigramCountsFr: Map<string, number> = new Map();
  private fourgramCountsFr: Map<string, number> = new Map();
  private frenchWordFreq: Map<string, number> = new Map();
  
  private isInitialized = false;

  /**
   * Initialize and train the SMT engine (bidirectional FR↔BBA)
   */
  async initialize(trainingPairs: TrainingPair[]): Promise<void> {
    console.log('🚀 Initializing Bidirectional Statistical Translation Engine...');
    console.log(`📊 Training data: ${trainingPairs.length} pairs`);
    
    const startTime = Date.now();

    // Build all models in parallel for BOTH directions
    await Promise.all([
      // FR→BBA direction
      this.buildPhraseTable(trainingPairs, 'fr-bba'),
      this.buildLanguageModel(trainingPairs, 'bba'),
      this.trainWordAlignment(trainingPairs, 'fr-bba'),
      
      // BBA→FR direction (inverted)
      this.buildPhraseTable(
        trainingPairs.map(p => ({ french: p.bariba, bariba: p.french, quality_score: p.quality_score })),
        'bba-fr'
      ),
      this.buildLanguageModel(trainingPairs, 'fr'),
      this.trainWordAlignment(
        trainingPairs.map(p => ({ french: p.bariba, bariba: p.french, quality_score: p.quality_score })),
        'bba-fr'
      )
    ]);

    this.isInitialized = true;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Bidirectional engine initialized in ${duration}s`);
    console.log(`   📊 FR→BBA: ${this.phraseTableFrBba.size} phrases`);
    console.log(`   📊 BBA→FR: ${this.phraseTableBbaFr.size} phrases`);
  }

  /**
   * Build phrase translation table with n-grams (1-7 words)
   */
  private async buildPhraseTable(pairs: TrainingPair[], direction: 'fr-bba' | 'bba-fr'): Promise<void> {
    console.log(`📖 Building phrase translation table (${direction})...`);
    const phraseCounts = new Map<string, Map<string, number>>();
    const targetTable = direction === 'fr-bba' ? this.phraseTableFrBba : this.phraseTableBbaFr;

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
      targetTable.set(frPhrase, entries.slice(0, 5));
    }

    console.log(`  ✓ Phrase table (${direction}): ${targetTable.size} entries`);
  }

  /**
   * Build n-gram language model (trigrams + 4-grams)
   */
  private async buildLanguageModel(pairs: TrainingPair[], lang: 'bba' | 'fr'): Promise<void> {
    console.log(`📚 Building n-gram language model (${lang})...`);
    
    const wordFreq = lang === 'bba' ? this.baribaWordFreq : this.frenchWordFreq;
    const trigramCounts = lang === 'bba' ? this.trigramCountsBba : this.trigramCountsFr;
    const fourgramCounts = lang === 'bba' ? this.fourgramCountsBba : this.fourgramCountsFr;
    const languageModel = lang === 'bba' ? this.languageModelBba : this.languageModelFr;

    for (const pair of pairs) {
      const words = this.tokenize(lang === 'bba' ? pair.bariba : pair.french);
      
      // Count word frequencies
      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }

      // Trigrams: P(w3 | w1, w2)
      for (let i = 2; i < words.length; i++) {
        const trigram = `${words[i-2]} ${words[i-1]} ${words[i]}`;
        trigramCounts.set(trigram, (trigramCounts.get(trigram) || 0) + 1);
      }

      // 4-grams: P(w4 | w1, w2, w3) - BALANCE: not 5-grams for speed
      for (let i = 3; i < words.length; i++) {
        const fourgram = `${words[i-3]} ${words[i-2]} ${words[i-1]} ${words[i]}`;
        fourgramCounts.set(fourgram, (fourgramCounts.get(fourgram) || 0) + 1);
      }
    }

    // Apply Kneser-Ney smoothing
    this.applyKneserNeySmoothing(lang);

    console.log(`  ✓ Language model (${lang}): ${languageModel.size} n-grams`);
  }

  /**
   * Apply Kneser-Ney smoothing for better handling of rare words
   */
  private applyKneserNeySmoothing(lang: 'bba' | 'fr'): void {
    const discount = 0.75; // Standard discount factor
    
    const trigramCounts = lang === 'bba' ? this.trigramCountsBba : this.trigramCountsFr;
    const fourgramCounts = lang === 'bba' ? this.fourgramCountsBba : this.fourgramCountsFr;
    const languageModel = lang === 'bba' ? this.languageModelBba : this.languageModelFr;

    // Smooth trigrams
    for (const [trigram, count] of trigramCounts.entries()) {
      const words = trigram.split(' ');
      const context = `${words[0]} ${words[1]}`;
      const contextCount = Array.from(trigramCounts.entries())
        .filter(([t]) => t.startsWith(context))
        .reduce((sum, [, c]) => sum + c, 0);
      
      const probability = Math.max(count - discount, 0) / contextCount;
      languageModel.set(trigram, probability);
    }

    // Smooth 4-grams
    for (const [fourgram, count] of fourgramCounts.entries()) {
      const words = fourgram.split(' ');
      const context = `${words[0]} ${words[1]} ${words[2]}`;
      const contextCount = Array.from(fourgramCounts.entries())
        .filter(([f]) => f.startsWith(context))
        .reduce((sum, [, c]) => sum + c, 0);
      
      const probability = Math.max(count - discount, 0) / contextCount;
      languageModel.set(fourgram, probability);
    }
  }

  /**
   * Train word alignment using simplified IBM Model 1
   */
  private async trainWordAlignment(pairs: TrainingPair[], direction: 'fr-bba' | 'bba-fr'): Promise<void> {
    console.log(`🔗 Training word alignment (IBM Model 1, ${direction})...`);
    
    const wordAlignment = direction === 'fr-bba' ? this.wordAlignmentFrBba : this.wordAlignmentBbaFr;

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
        
        wordAlignment.set(frWord, alignments);
      }
    }

    console.log(`  ✓ Word alignment (${direction}): ${wordAlignment.size} alignments`);
  }

  /**
   * Translate using Enhanced Beam Search (supports both FR→BBA and BBA→FR)
   */
  translate(text: string, beamSize: number = 12, direction: 'fr-bba' | 'bba-fr' = 'fr-bba'): TranslationResult {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    const sourceWords = this.tokenize(text);
    const candidates = this.beamSearch(sourceWords, beamSize, direction);

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
   * Beam Search decoder with dynamic restructuring (bidirectional)
   */
  private beamSearch(sourceWords: string[], beamSize: number, direction: 'fr-bba' | 'bba-fr'): Array<{
    translation: string;
    score: number;
    phraseScore: number;
    lmScore: number;
    alignmentScore: number;
  }> {
    const phraseTable = direction === 'fr-bba' ? this.phraseTableFrBba : this.phraseTableBbaFr;
    const wordAlignment = direction === 'fr-bba' ? this.wordAlignmentFrBba : this.wordAlignmentBbaFr;
    const languageModel = direction === 'fr-bba' ? this.languageModelBba : this.languageModelFr;
    
    const candidates: Array<{
      translation: string;
      score: number;
      phraseScore: number;
      lmScore: number;
      alignmentScore: number;
    }> = [];

    // Generate multiple translation candidates
    for (let beam = 0; beam < beamSize; beam++) {
      const targetWords: string[] = [];
      let phraseScore = 0;
      let alignmentScore = 0;

      let i = 0;
      while (i < sourceWords.length) {
        let bestMatch: { phrase: string; length: number; score: number } | null = null;

        // Try longest phrase first (7 down to 1)
        for (let len = Math.min(7, sourceWords.length - i); len >= 1; len--) {
          const srcPhrase = sourceWords.slice(i, i + len).join(' ');
          const entries = phraseTable.get(srcPhrase);

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
          targetWords.push(...bestMatch.phrase.split(' '));
          phraseScore += Math.log(bestMatch.score + 1e-10);
          i += bestMatch.length;
        } else {
          // Fallback: word-level alignment
          const srcWord = sourceWords[i];
          const alignments = wordAlignment.get(srcWord);
          
          if (alignments && alignments.size > 0) {
            const sorted = Array.from(alignments.entries()).sort((a, b) => b[1] - a[1]);
            const idx = Math.min(beam % sorted.length, sorted.length - 1);
            targetWords.push(sorted[idx][0]);
            alignmentScore += Math.log(sorted[idx][1] + 1e-10);
          } else {
            targetWords.push(srcWord); // Keep original if no translation
          }
          i++;
        }
      }

      // Calculate language model score
      const translation = targetWords.join(' ');
      const lmScore = this.scoreLanguageModel(targetWords, languageModel);

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
  private scoreLanguageModel(words: string[], languageModel: Map<string, number>): number {
    let score = 0;
    let count = 0;

    // Score with 4-grams
    for (let i = 3; i < words.length; i++) {
      const fourgram = `${words[i-3]} ${words[i-2]} ${words[i-1]} ${words[i]}`;
      const prob = languageModel.get(fourgram);
      if (prob) {
        score += Math.log(prob + 1e-10);
        count++;
      }
    }

    // Score with trigrams
    for (let i = 2; i < words.length; i++) {
      const trigram = `${words[i-2]} ${words[i-1]} ${words[i]}`;
      const prob = languageModel.get(trigram);
      if (prob) {
        score += Math.log(prob + 1e-10);
        count++;
      }
    }

    return count > 0 ? score / count : -10;
  }

  /**
   * Get word alignment probability (kept for backward compatibility, uses FR→BBA)
   */
  private getAlignment(frenchWord: string, baribaWord: string): number | undefined {
    return this.wordAlignmentFrBba.get(frenchWord)?.get(baribaWord);
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
