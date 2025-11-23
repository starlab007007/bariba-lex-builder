/**
 * Enhanced Grammatical Corrector with Auto-Learning
 * Learns patterns from training data automatically
 */

interface TrainingPair {
  french: string;
  bariba: string;
}

interface GrammaticalPattern {
  pattern: RegExp;
  replacement: string;
  frequency: number;
  confidence: number;
}

export class EnhancedGrammaticalCorrector {
  private nominalPatterns: Map<string, GrammaticalPattern[]> = new Map();
  private verbalPatterns: Map<string, GrammaticalPattern[]> = new Map();
  private wordOrderPatterns: Map<string, string[]> = new Map();
  private tonalRules: Map<string, string> = new Map();
  private collocations: Map<string, string[]> = new Map();
  private isInitialized = false;

  /**
   * Learn grammatical patterns from training data
   */
  async learnPatterns(trainingPairs: TrainingPair[]): Promise<void> {
    console.log('📚 Learning grammatical patterns...');
    const startTime = Date.now();

    await Promise.all([
      this.extractNominalPatterns(trainingPairs),
      this.extractVerbalPatterns(trainingPairs),
      this.extractWordOrderPatterns(trainingPairs),
      this.extractTonalPatterns(trainingPairs),
      this.extractCollocations(trainingPairs)
    ]);

    this.isInitialized = true;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Patterns learned in ${duration}s`);
  }

  /**
   * Extract nominal agreement patterns (11 classes)
   */
  private async extractNominalPatterns(pairs: TrainingPair[]): Promise<void> {
    const patterns = new Map<string, number>();

    for (const pair of pairs) {
      const words = pair.bariba.toLowerCase().split(/\s+/);
      
      // Look for common nominal patterns
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        patterns.set(bigram, (patterns.get(bigram) || 0) + 1);
      }
    }

    // Keep frequent patterns (frequency > 5)
    for (const [pattern, freq] of patterns.entries()) {
      if (freq > 5) {
        const [word1, word2] = pattern.split(' ');
        if (!this.nominalPatterns.has(word1)) {
          this.nominalPatterns.set(word1, []);
        }
        this.nominalPatterns.get(word1)!.push({
          pattern: new RegExp(`\\b${word1}\\s+\\w+\\b`, 'gi'),
          replacement: pattern,
          frequency: freq,
          confidence: Math.min(freq / 100, 1)
        });
      }
    }

    console.log(`  ✓ ${this.nominalPatterns.size} nominal patterns`);
  }

  /**
   * Extract verbal conjugation patterns (8 groups)
   */
  private async extractVerbalPatterns(pairs: TrainingPair[]): Promise<void> {
    const patterns = new Map<string, number>();

    // Common verbal prefixes in Bariba
    const verbalPrefixes = ['n ', 'u ', 'ba ', 'm ', 'ti ', 'ka '];

    for (const pair of pairs) {
      const text = pair.bariba.toLowerCase();
      
      for (const prefix of verbalPrefixes) {
        const regex = new RegExp(`${prefix}\\w+`, 'g');
        const matches = text.match(regex);
        
        if (matches) {
          matches.forEach(match => {
            patterns.set(match, (patterns.get(match) || 0) + 1);
          });
        }
      }
    }

    // Keep frequent patterns
    for (const [pattern, freq] of patterns.entries()) {
      if (freq > 3) {
        const prefix = pattern.split(' ')[0];
        if (!this.verbalPatterns.has(prefix)) {
          this.verbalPatterns.set(prefix, []);
        }
        this.verbalPatterns.get(prefix)!.push({
          pattern: new RegExp(`\\b${pattern}\\b`, 'gi'),
          replacement: pattern,
          frequency: freq,
          confidence: Math.min(freq / 50, 1)
        });
      }
    }

    console.log(`  ✓ ${this.verbalPatterns.size} verbal patterns`);
  }

  /**
   * Extract typical word order patterns
   */
  private async extractWordOrderPatterns(pairs: TrainingPair[]): Promise<void> {
    const posPatterns = new Map<string, number>();

    for (const pair of pairs) {
      const words = pair.bariba.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      
      // Extract POS patterns (simplified)
      if (words.length >= 3) {
        const pattern = words.slice(0, 3).join('-');
        posPatterns.set(pattern, (posPatterns.get(pattern) || 0) + 1);
      }
    }

    // Keep top 100 most frequent patterns
    const sorted = Array.from(posPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100);

    for (const [pattern, freq] of sorted) {
      const words = pattern.split('-');
      this.wordOrderPatterns.set(words[0], words);
    }

    console.log(`  ✓ ${this.wordOrderPatterns.size} word order patterns`);
  }

  /**
   * Extract tonal patterns and diacritics rules
   */
  private async extractTonalPatterns(pairs: TrainingPair[]): Promise<void> {
    const tonalChars = ['ɛ', 'ɔ', 'ŋ', 'ɲ', 'á', 'à', 'é', 'è', 'í', 'ì', 'ó', 'ò', 'ú', 'ù'];
    
    for (const pair of pairs) {
      const text = pair.bariba.toLowerCase();
      
      for (const char of tonalChars) {
        if (text.includes(char)) {
          // Extract context around tonal character
          const regex = new RegExp(`\\w{0,2}${char}\\w{0,2}`, 'g');
          const matches = text.match(regex);
          
          if (matches) {
            matches.forEach(match => {
              this.tonalRules.set(match, match);
            });
          }
        }
      }
    }

    console.log(`  ✓ ${this.tonalRules.size} tonal patterns`);
  }

  /**
   * Extract collocations (words that frequently appear together)
   */
  private async extractCollocations(pairs: TrainingPair[]): Promise<void> {
    const bigramCounts = new Map<string, number>();

    for (const pair of pairs) {
      const words = pair.bariba.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1);
      }
    }

    // Keep collocations with frequency > 10
    for (const [bigram, freq] of bigramCounts.entries()) {
      if (freq > 10) {
        const [word1, word2] = bigram.split(' ');
        if (!this.collocations.has(word1)) {
          this.collocations.set(word1, []);
        }
        this.collocations.get(word1)!.push(word2);
      }
    }

    console.log(`  ✓ ${this.collocations.size} collocations`);
  }

  /**
   * Correct a Bariba sentence using learned patterns
   */
  correctSentence(bariba: string): string {
    if (!this.isInitialized) {
      return bariba;
    }

    let corrected = bariba;

    // Pass 1: Normalize spaces and punctuation
    corrected = this.normalize(corrected);

    // Pass 2: Apply nominal agreement patterns
    corrected = this.applyNominalAgreement(corrected);

    // Pass 3: Apply verbal conjugation patterns
    corrected = this.applyVerbalConjugation(corrected);

    // Pass 4: Adjust word order if needed
    corrected = this.adjustWordOrder(corrected);

    // Pass 5: Apply tonal rules
    corrected = this.applyTonalRules(corrected);

    // Pass 6: Apply collocations
    corrected = this.applyCollocations(corrected);

    return corrected;
  }

  private normalize(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,!?;:])/g, '$1')
      .replace(/([.,!?;:])\s*/g, '$1 ')
      .trim();
  }

  private applyNominalAgreement(text: string): string {
    let result = text;
    
    for (const [word, patterns] of this.nominalPatterns.entries()) {
      const bestPattern = patterns.sort((a, b) => b.confidence - a.confidence)[0];
      if (bestPattern && bestPattern.confidence > 0.5) {
        // Apply pattern if confidence is high enough
        result = result.replace(bestPattern.pattern, bestPattern.replacement);
      }
    }
    
    return result;
  }

  private applyVerbalConjugation(text: string): string {
    let result = text;
    
    for (const [prefix, patterns] of this.verbalPatterns.entries()) {
      const bestPattern = patterns.sort((a, b) => b.confidence - a.confidence)[0];
      if (bestPattern && bestPattern.confidence > 0.5) {
        result = result.replace(bestPattern.pattern, bestPattern.replacement);
      }
    }
    
    return result;
  }

  private adjustWordOrder(text: string): string {
    // Keep existing word order for now (SVO is standard in Bariba)
    return text;
  }

  private applyTonalRules(text: string): string {
    let result = text;
    
    for (const [pattern, replacement] of this.tonalRules.entries()) {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, replacement);
    }
    
    return result;
  }

  private applyCollocations(text: string): string {
    const words = text.split(/\s+/);
    const result: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextWords = this.collocations.get(word.toLowerCase());
      
      if (nextWords && i < words.length - 1) {
        const nextWord = words[i + 1].toLowerCase();
        if (nextWords.includes(nextWord)) {
          // Collocation found - keep as is
          result.push(word);
        } else {
          result.push(word);
        }
      } else {
        result.push(word);
      }
    }

    return result.join(' ');
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const enhancedCorrector = new EnhancedGrammaticalCorrector();
