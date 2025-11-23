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
   * Build phrase translation table with n-grams (1-4 words) - SIMPLIFIED
   */
  private async buildPhraseTable(pairs: TrainingPair[], direction: 'fr-bba' | 'bba-fr'): Promise<void> {
    console.log(`📖 Building simplified phrase table (${direction})...`);
    const phraseCounts = new Map<string, Map<string, number>>();
    const targetTable = direction === 'fr-bba' ? this.phraseTableFrBba : this.phraseTableBbaFr;

    for (const pair of pairs) {
      const frenchWords = this.tokenize(pair.french);
      const baribaWords = this.tokenize(pair.bariba);

      // Extract n-grams from 1 to 4 words ONLY (reduced from 7 for speed)
      for (let n = 1; n <= Math.min(4, frenchWords.length); n++) {
        for (let i = 0; i <= frenchWords.length - n; i++) {
          const frPhrase = frenchWords.slice(i, i + n).join(' ');
          
          // Try to find corresponding Bariba segment
          for (let m = 1; m <= Math.min(4, baribaWords.length); m++) {
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

    // Calculate probabilities - SIMPLIFIED (no Laplace smoothing)
    for (const [frPhrase, bbaCounts] of phraseCounts.entries()) {
      const total = Array.from(bbaCounts.values()).reduce((a, b) => a + b, 0);
      const entries: PhraseTableEntry[] = [];

      for (const [bbaPhrase, count] of bbaCounts.entries()) {
        const probability = count / total;
        if (probability > 0.05) { // Higher threshold (was 0.01)
          entries.push({ target: bbaPhrase, probability, count });
        }
      }

      // Keep top 3 translations per source phrase (reduced from 5)
      entries.sort((a, b) => b.probability - a.probability);
      targetTable.set(frPhrase, entries.slice(0, 3));
    }

    console.log(`  ✓ Phrase table (${direction}): ${targetTable.size} entries`);
  }

  /**
   * Build simple co-occurrence dictionary (replaces heavy LM)
   */
  private async buildLanguageModel(pairs: TrainingPair[], lang: 'bba' | 'fr'): Promise<void> {
    console.log(`📚 Building simple co-occurrence dictionary (${lang})...`);
    
    const wordFreq = lang === 'bba' ? this.baribaWordFreq : this.frenchWordFreq;

    for (const pair of pairs) {
      const words = this.tokenize(lang === 'bba' ? pair.bariba : pair.french);
      
      // Count word frequencies ONLY (no n-grams)
      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    console.log(`  ✓ Co-occurrence dictionary (${lang}): ${wordFreq.size} words`);
  }

  /**
   * Build simple word alignment via co-occurrence (replaces IBM Model 1 + EM)
   */
  private async trainWordAlignment(pairs: TrainingPair[], direction: 'fr-bba' | 'bba-fr'): Promise<void> {
    console.log(`🔗 Building simple word alignments (${direction})...`);
    
    const wordAlignment = direction === 'fr-bba' ? this.wordAlignmentFrBba : this.wordAlignmentBbaFr;

    // Simple co-occurrence counting (no EM algorithm)
    for (const pair of pairs) {
      const frWords = this.tokenize(pair.french);
      const bbaWords = this.tokenize(pair.bariba);

      for (const frWord of frWords) {
        if (!wordAlignment.has(frWord)) {
          wordAlignment.set(frWord, new Map());
        }
        const bbaMap = wordAlignment.get(frWord)!;
        
        for (const bbaWord of bbaWords) {
          bbaMap.set(bbaWord, (bbaMap.get(bbaWord) || 0) + 1);
        }
      }
    }

    // Normalize to probabilities and keep top 3 per word
    for (const [frWord, bbaMap] of wordAlignment.entries()) {
      const total = Array.from(bbaMap.values()).reduce((a, b) => a + b, 0);
      const normalized = new Map<string, number>();
      
      Array.from(bbaMap.entries())
        .map(([word, count]) => ({ word, prob: count / total }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3) // Keep only top 3
        .forEach(({ word, prob }) => normalized.set(word, prob));
      
      wordAlignment.set(frWord, normalized);
    }

    console.log(`  ✓ Word alignments (${direction}): ${wordAlignment.size} alignments`);
  }

  /**
   * Translate using SIMPLIFIED Beam Search (supports both FR→BBA and BBA→FR)
   */
  translate(text: string, beamSize: number = 3, direction: 'fr-bba' | 'bba-fr' = 'fr-bba'): TranslationResult {
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
      alternatives: candidates.slice(1, 3).map(c => c.translation),
      phraseScore: candidates[0].phraseScore,
      lmScore: 0, // Removed LM scoring
      alignmentScore: candidates[0].alignmentScore
    };
  }

  /**
   * SIMPLIFIED Beam Search decoder (removed LM scoring, reduced beam size)
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
    
    const candidates: Array<{
      translation: string;
      score: number;
      phraseScore: number;
      lmScore: number;
      alignmentScore: number;
    }> = [];

    // Generate translation candidates (reduced beam size)
    for (let beam = 0; beam < beamSize; beam++) {
      const targetWords: string[] = [];
      let phraseScore = 0;
      let alignmentScore = 0;

      let i = 0;
      while (i < sourceWords.length) {
        let bestMatch: { phrase: string; length: number; score: number } | null = null;

        // Try longest phrase first (4 down to 1, reduced from 7)
        for (let len = Math.min(4, sourceWords.length - i); len >= 1; len--) {
          const srcPhrase = sourceWords.slice(i, i + len).join(' ');
          const entries = phraseTable.get(srcPhrase);

          if (entries && entries.length > 0) {
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
          
          // Early stop if high confidence
          if (bestMatch.score > 0.85) {
            break;
          }
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
            targetWords.push(srcWord);
          }
          i++;
        }
      }

      const translation = targetWords.join(' ');
      
      // Simplified scoring: phrase probability ONLY (no LM, no complex alignment)
      const totalScore = phraseScore; // 100% phrase-based

      candidates.push({
        translation,
        score: Math.exp(totalScore),
        phraseScore,
        lmScore: 0, // Removed
        alignmentScore
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
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
