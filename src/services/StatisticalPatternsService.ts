/**
 * Statistical Patterns Service
 * Lightweight statistical analysis for SimplifiedAI
 * Extracts grammatical patterns and reordering rules from training data
 */

interface TrainingPair {
  french: string;
  bariba: string;
}

interface WordAlignment {
  frenchWord: string;
  baribaWord: string;
  probability: number;
}

interface GrammaticalPattern {
  frenchPattern: string;
  baribaPattern: string;
  frequency: number;
}

export class StatisticalPatternsService {
  private wordTranslations: Map<string, Map<string, number>> = new Map(); // FR word -> BBA word -> count
  private bigramPatterns: Map<string, string[]> = new Map(); // FR bigram -> BBA translations
  private trigramPatterns: Map<string, string[]> = new Map(); // FR trigram -> BBA translations
  private reorderingRules: GrammaticalPattern[] = [];
  private isInitialized = false;

  /**
   * Analyze training pairs to extract statistical patterns
   */
  async initialize(trainingPairs: TrainingPair[]): Promise<void> {
    console.log("📊 Analyzing statistical patterns from training data...");
    const startTime = Date.now();

    // 1. Build word-to-word translation probabilities
    this.buildWordTranslations(trainingPairs);

    // 2. Extract bigram and trigram patterns
    this.extractNGramPatterns(trainingPairs);

    // 3. Learn reordering rules (SVO → SOV, etc.)
    this.learnReorderingRules(trainingPairs);

    this.isInitialized = true;
    const duration = Date.now() - startTime;

    console.log("✅ Statistical patterns initialized:");
    console.log(`   📝 Word translations: ${this.wordTranslations.size}`);
    console.log(`   📐 Bigram patterns: ${this.bigramPatterns.size}`);
    console.log(`   📐 Trigram patterns: ${this.trigramPatterns.size}`);
    console.log(`   🔄 Reordering rules: ${this.reorderingRules.length}`);
    console.log(`   ⏱️ Duration: ${duration}ms`);
  }

  /**
   * Build word-to-word translation probabilities
   */
  private buildWordTranslations(pairs: TrainingPair[]): void {
    for (const pair of pairs) {
      const frWords = this.tokenize(pair.french);
      const baWords = this.tokenize(pair.bariba);

      // Simple co-occurrence counting
      for (const frWord of frWords) {
        if (!this.wordTranslations.has(frWord)) {
          this.wordTranslations.set(frWord, new Map());
        }
        const baMap = this.wordTranslations.get(frWord)!;
        
        for (const baWord of baWords) {
          baMap.set(baWord, (baMap.get(baWord) || 0) + 1);
        }
      }
    }

    // Normalize to probabilities and keep only top 3 per word
    for (const [frWord, baMap] of this.wordTranslations.entries()) {
      const total = Array.from(baMap.values()).reduce((a, b) => a + b, 0);
      const normalized = new Map<string, number>();
      
      const sorted = Array.from(baMap.entries())
        .map(([word, count]) => ({ word, prob: count / total }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3); // Keep only top 3

      sorted.forEach(({ word, prob }) => normalized.set(word, prob));
      this.wordTranslations.set(frWord, normalized);
    }
  }

  /**
   * Extract bigram and trigram patterns
   */
  private extractNGramPatterns(pairs: TrainingPair[]): void {
    const bigramCounts = new Map<string, Map<string, number>>();
    const trigramCounts = new Map<string, Map<string, number>>();

    for (const pair of pairs) {
      const frWords = this.tokenize(pair.french);
      const baPhrase = pair.bariba;

      // Bigrams
      for (let i = 0; i < frWords.length - 1; i++) {
        const bigram = `${frWords[i]} ${frWords[i + 1]}`;
        if (!bigramCounts.has(bigram)) {
          bigramCounts.set(bigram, new Map());
        }
        const baMap = bigramCounts.get(bigram)!;
        baMap.set(baPhrase, (baMap.get(baPhrase) || 0) + 1);
      }

      // Trigrams
      for (let i = 0; i < frWords.length - 2; i++) {
        const trigram = `${frWords[i]} ${frWords[i + 1]} ${frWords[i + 2]}`;
        if (!trigramCounts.has(trigram)) {
          trigramCounts.set(trigram, new Map());
        }
        const baMap = trigramCounts.get(trigram)!;
        baMap.set(baPhrase, (baMap.get(baPhrase) || 0) + 1);
      }
    }

    // Keep only top 3 translations per n-gram
    for (const [bigram, baMap] of bigramCounts.entries()) {
      const top3 = Array.from(baMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([phrase]) => phrase);
      this.bigramPatterns.set(bigram, top3);
    }

    for (const [trigram, baMap] of trigramCounts.entries()) {
      const top3 = Array.from(baMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([phrase]) => phrase);
      this.trigramPatterns.set(trigram, top3);
    }
  }

  /**
   * Learn common reordering patterns (e.g., SVO → SOV)
   */
  private learnReorderingRules(pairs: TrainingPair[]): void {
    // Simple heuristic: detect common word order differences
    const patterns = new Map<string, number>();

    for (const pair of pairs) {
      const frWords = this.tokenize(pair.french);
      const baWords = this.tokenize(pair.bariba);

      // Create simplified patterns (preserve only structure)
      const frPattern = frWords.map(w => this.getWordType(w)).join(' ');
      const baPattern = baWords.map(w => this.getWordType(w)).join(' ');

      if (frPattern !== baPattern && frPattern.length > 0 && baPattern.length > 0) {
        const rule = `${frPattern} → ${baPattern}`;
        patterns.set(rule, (patterns.get(rule) || 0) + 1);
      }
    }

    // Keep patterns that occur at least 5 times
    this.reorderingRules = Array.from(patterns.entries())
      .filter(([, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50) // Keep top 50
      .map(([rule, frequency]) => {
        const [frenchPattern, baribaPattern] = rule.split(' → ');
        return { frenchPattern, baribaPattern, frequency };
      });
  }

  /**
   * Get most likely Bariba translation for a French word
   */
  getWordTranslation(frenchWord: string): string | null {
    const normalized = frenchWord.toLowerCase();
    const translations = this.wordTranslations.get(normalized);
    
    if (!translations || translations.size === 0) return null;
    
    // Return most probable translation
    let maxProb = 0;
    let bestTranslation = null;
    
    for (const [word, prob] of translations.entries()) {
      if (prob > maxProb) {
        maxProb = prob;
        bestTranslation = word;
      }
    }
    
    return bestTranslation;
  }

  /**
   * Get all possible translations with probabilities
   */
  getWordTranslations(frenchWord: string): Array<{ word: string; probability: number }> {
    const normalized = frenchWord.toLowerCase();
    const translations = this.wordTranslations.get(normalized);
    
    if (!translations) return [];
    
    return Array.from(translations.entries())
      .map(([word, probability]) => ({ word, probability }))
      .sort((a, b) => b.probability - a.probability);
  }

  /**
   * Find matching bigram patterns
   */
  findBigramPattern(frenchBigram: string): string[] {
    return this.bigramPatterns.get(frenchBigram.toLowerCase()) || [];
  }

  /**
   * Find matching trigram patterns
   */
  findTrigramPattern(frenchTrigram: string): string[] {
    return this.trigramPatterns.get(frenchTrigram.toLowerCase()) || [];
  }

  /**
   * Apply reordering rules to a phrase structure
   */
  applyReorderingRules(frenchWords: string[]): string[] | null {
    const frPattern = frenchWords.map(w => this.getWordType(w)).join(' ');
    
    for (const rule of this.reorderingRules) {
      if (rule.frenchPattern === frPattern) {
        // Apply the reordering transformation
        const baPatternWords = rule.baribaPattern.split(' ');
        
        // Simple mapping (this is a simplification, real impl would be more sophisticated)
        if (frenchWords.length === baPatternWords.length) {
          return frenchWords; // Keep same order for now (could be enhanced)
        }
      }
    }
    
    return null;
  }

  /**
   * Translate phrase using statistical patterns
   */
  translateWithPatterns(text: string): { translation: string; confidence: number } | null {
    const words = this.tokenize(text);
    if (words.length === 0) return null;

    // Try trigrams first (most specific)
    if (words.length >= 3) {
      for (let i = 0; i <= words.length - 3; i++) {
        const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        const matches = this.findTrigramPattern(trigram);
        if (matches.length > 0) {
          return { translation: matches[0], confidence: 85 };
        }
      }
    }

    // Try bigrams (moderately specific)
    if (words.length >= 2) {
      for (let i = 0; i <= words.length - 2; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        const matches = this.findBigramPattern(bigram);
        if (matches.length > 0) {
          return { translation: matches[0], confidence: 75 };
        }
      }
    }

    // Fallback: word-by-word with patterns
    const translated: string[] = [];
    let totalConfidence = 0;
    let wordCount = 0;

    for (const word of words) {
      const translation = this.getWordTranslation(word);
      if (translation) {
        translated.push(translation);
        const translations = this.getWordTranslations(word);
        totalConfidence += (translations[0]?.probability || 0.5) * 100;
        wordCount++;
      } else {
        translated.push(word); // Keep original if no translation
        totalConfidence += 30; // Low confidence for unknown words
        wordCount++;
      }
    }

    if (translated.length === 0) return null;

    return {
      translation: translated.join(' '),
      confidence: Math.round(totalConfidence / wordCount)
    };
  }

  /**
   * Get word type for pattern matching (simplified)
   */
  private getWordType(word: string): string {
    const w = word.toLowerCase();
    
    // French determiners
    if (['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de'].includes(w)) return 'DET';
    
    // French pronouns
    if (['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'].includes(w)) return 'PRON';
    
    // French common verbs
    if (['est', 'sont', 'être', 'avoir', 'va', 'fait', 'dit'].includes(w)) return 'VERB';
    
    // French prepositions
    if (['à', 'de', 'en', 'dans', 'sur', 'avec', 'pour'].includes(w)) return 'PREP';
    
    // Default
    return 'WORD';
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

  isReady(): boolean {
    return this.isInitialized;
  }

  getStats() {
    return {
      wordTranslations: this.wordTranslations.size,
      bigramPatterns: this.bigramPatterns.size,
      trigramPatterns: this.trigramPatterns.size,
      reorderingRules: this.reorderingRules.length,
      isReady: this.isInitialized
    };
  }
}

export const statisticalPatterns = new StatisticalPatternsService();
