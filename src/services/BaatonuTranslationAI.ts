import { pipeline } from "@huggingface/transformers";
import { type DictionaryEntry } from "@/data/fullDictionaryData";
import { GrammaticalRulesEngine } from './GrammaticalRulesEngine';
import {
  sortBaatonum,
  normalizeNasalVowels,
  normalizeTones,
  extractNominalClass,
  conjugateVerb,
  declineAdjective,
  generateBenefactiveForm,
  applyDerivationalSuffix,
  type DerivationalSuffix
} from '@/utils/baatonumLinguistics';
import { parseFullDictionaryEntry, extractExamples, detectTonePattern } from '@/utils/baatonumParser';

export interface TranslationModel {
  translateFrenchToBariba: (text: string) => Promise<string>;
  translateBaribaToFrench: (text: string) => Promise<string>;
  initialize: () => Promise<void>;
  isReady: boolean;
}

export interface TrainingData {
  source: string;
  target: string;
  confidence: number;
}

export class BaatonuTranslationAI implements TranslationModel {
  private dictionaryEntries: DictionaryEntry[] = [];
  private translationPatterns: Map<string, string[]> = new Map();
  private reversePatterns: Map<string, string[]> = new Map();
  private wordEmbeddings: Map<string, number[]> = new Map();
  private phrasePatterns: RegExp[] = [];
  private isInitialized = false;
  
  // Modèles IA pour améliorer la traduction
  private sentenceTransformer: any = null;
  private textGenerator: any = null;
  
  // Moteur de règles grammaticales
  private grammarEngine: GrammaticalRulesEngine;

  // Règles linguistiques spécifiques au Bariba
  private linguisticRules = {
    // Préfixes nominaux
    prefixes: {
      'le': 'u', 'la': 'u', 'les': 'ba', 'un': 'kɑ', 'une': 'kɑ', 'des': 'ba'
    },
    // Conjugaisons de base
    conjugations: {
      'je': 'n', 'tu': 'a', 'il': 'u', 'elle': 'u', 'nous': 'ti', 'vous': 'yi', 'ils': 'ba', 'elles': 'ba'
    },
    // Patterns de tons (simplifié)
    tonePatterns: {
      'haut': '́', 'bas': '̀', 'moyen': '̄'
    },
    // Mots de liaison communs
    connectors: {
      'et': 'kɑ', 'ou': 'subu', 'mais': 'ɑmɑ', 'donc': 'yerɑ', 'car': 'bɑru', 
      'si': 'foo', 'que': 'kɑ', 'parce que': 'bɑru', 'pour': 'tɔ̃'
    },
    // Adjectifs de base
    adjectives: {
      'grand': 'deburu', 'petit': 'biiku', 'bon': 'nɔɔrɑ', 'mauvais': 'bɔkɔ',
      'beau': 'nɔɔrɑ', 'nouveau': 'kuru', 'vieux': 'kpɑɑru', 'jeune': 'sɑnɑwu'
    },
    // Verbes courants avec leurs formes
    commonVerbs: {
      'être': 'de', 'avoir': 'gbee', 'faire': 'yo', 'dire': 'nɛ', 'aller': 'su',
      'venir': 'wɑ', 'voir': 'yɑm', 'savoir': 'mɔ', 'pouvoir': 'seke', 'vouloir': 'bɑɑ'
    },
    // Négations
    negations: {
      'ne...pas': 'kɑ...sɑ', 'ne...plus': 'kɑ...gbenɑ', 'ne...jamais': 'kɑ...dɑɑ'
    }
  };

  constructor(entries: DictionaryEntry[]) {
    this.dictionaryEntries = entries;
    this.grammarEngine = new GrammaticalRulesEngine();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🚀 Initialisation du modèle de traduction Bààtɔ̀nú...");
    
    try {
      // 1. Construire les patterns de traduction à partir du dictionnaire
      await this.buildTranslationPatterns();
      
      // 2. Initialiser les modèles IA pour l'amélioration contextuelle
      await this.initializeAIModels();
      
      // 3. Entraîner sur les données du dictionnaire
      await this.trainOnDictionaryData();
      
      this.isInitialized = true;
      console.log("✅ Modèle de traduction Bààtɔ̀nú initialisé avec succès!");
      
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation:", error);
      // Fallback: utiliser seulement les patterns du dictionnaire
      await this.buildTranslationPatterns();
      this.isInitialized = true;
    }
  }

  private async buildTranslationPatterns(): Promise<void> {
    console.log("📚 Construction des patterns de traduction...");
    
    for (const entry of this.dictionaryEntries) {
      // Patterns français -> bariba
      const frenchWords = this.extractFrenchWords(entry);
      for (const frenchWord of frenchWords) {
        const key = frenchWord.toLowerCase().trim();
        if (!this.translationPatterns.has(key)) {
          this.translationPatterns.set(key, []);
        }
        this.translationPatterns.get(key)!.push(entry.word);
      }

      // Patterns bariba -> français
      const baribaWord = entry.word.toLowerCase().trim();
      if (!this.reversePatterns.has(baribaWord)) {
        this.reversePatterns.set(baribaWord, []);
      }
      this.reversePatterns.get(baribaWord)!.push(entry.definition);

      // Ajouter les variantes
      entry.variants?.forEach(variant => {
        const variantKey = variant.toLowerCase().trim();
        if (!this.reversePatterns.has(variantKey)) {
          this.reversePatterns.set(variantKey, []);
        }
        this.reversePatterns.get(variantKey)!.push(entry.definition);
      });
    }

    console.log(`📊 ${this.translationPatterns.size} patterns français->bariba créés`);
    console.log(`📊 ${this.reversePatterns.size} patterns bariba->français créés`);
  }

  private async initializeAIModels(): Promise<void> {
    try {
      console.log("🤖 Initialisation des modèles IA...");
      
      // Modèle pour comprendre le contexte et les similarités
      this.sentenceTransformer = await pipeline(
        "feature-extraction",
        "mixedbread-ai/mxbai-embed-xsmall-v1",
        { device: "webgpu" }
      );
      
      console.log("✅ Modèles IA initialisés");
    } catch (error) {
      console.warn("⚠️ Impossible d'initialiser les modèles IA, utilisation du mode dictionnaire:", error);
    }
  }

  private async trainOnDictionaryData(): Promise<void> {
    console.log("🎯 Entraînement sur les données du dictionnaire...");
    
    // Créer des paires d'entraînement à partir des exemples
    const trainingPairs: TrainingData[] = [];
    
    for (const entry of this.dictionaryEntries) {
      // Paires mot-définition
      trainingPairs.push({
        source: entry.word,
        target: entry.definition,
        confidence: 1.0
      });

      // Paires exemples bariba-français
      if (entry.example_bariba && entry.example_francais) {
        for (let i = 0; i < Math.min(entry.example_bariba.length, entry.example_francais.length); i++) {
          trainingPairs.push({
            source: entry.example_bariba[i],
            target: entry.example_francais[i],
            confidence: 0.9
          });
          
          // Inverse aussi
          trainingPairs.push({
            source: entry.example_francais[i],
            target: entry.example_bariba[i],
            confidence: 0.9
          });
        }
      }
    }

    console.log(`🎯 ${trainingPairs.length} paires d'entraînement créées`);
    
    // Créer des embeddings pour les mots si le modèle IA est disponible
    if (this.sentenceTransformer) {
      await this.createWordEmbeddings(trainingPairs);
    }
  }

  private async createWordEmbeddings(trainingPairs: TrainingData[]): Promise<void> {
    console.log("🧠 Création des embeddings sémantiques...");
    
    try {
      const uniqueWords = Array.from(new Set([
        ...trainingPairs.map(p => p.source),
        ...trainingPairs.map(p => p.target)
      ]));

      const batchSize = 50;
      for (let i = 0; i < uniqueWords.length; i += batchSize) {
        const batch = uniqueWords.slice(i, i + batchSize);
        const embeddings = await this.sentenceTransformer(batch, { 
          pooling: "mean", 
          normalize: true 
        });
        
        batch.forEach((word, idx) => {
          this.wordEmbeddings.set(word.toLowerCase(), embeddings.tolist()[idx]);
        });
      }
      
      console.log(`🧠 ${this.wordEmbeddings.size} embeddings créés`);
    } catch (error) {
      console.warn("⚠️ Erreur lors de la création des embeddings:", error);
    }
  }

  async translateFrenchToBariba(text: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`🔄 Traduction FR->Bààtɔ̀nú: "${text}"`);
    
    // 1. Appliquer les règles linguistiques pré-traduction
    text = this.applyPreTranslationRules(text, 'french-to-bariba');
    
    // 2. Nettoyage et préparation du texte
    const cleanText = this.cleanText(text);
    const words = this.tokenize(cleanText);
    
    // 3. Traduction mot par mot avec le dictionnaire et les règles
    const translatedWords: string[] = [];
    const unmatchedWords: string[] = [];
    
    for (const word of words) {
      // D'abord vérifier les règles linguistiques
      const ruleTranslation = this.applyLinguisticRulesForWord(word.toLowerCase(), 'french-to-bariba');
      if (ruleTranslation) {
        translatedWords.push(ruleTranslation);
        continue;
      }

      // Ensuite chercher dans le dictionnaire
      const translations = this.translationPatterns.get(word.toLowerCase());
      if (translations && translations.length > 0) {
        // Prendre la première traduction (plus fréquente)
        translatedWords.push(translations[0]);
      } else {
        // Essayer de trouver des mots similaires
        const similarWord = await this.findSimilarWord(word, 'french');
        if (similarWord) {
          const similarTranslations = this.translationPatterns.get(similarWord);
          if (similarTranslations) {
            translatedWords.push(similarTranslations[0]);
          } else {
            translatedWords.push(`[${word}]`);
            unmatchedWords.push(word);
          }
        } else {
          translatedWords.push(`[${word}]`);
          unmatchedWords.push(word);
        }
      }
    }
    
    // 3. Post-traitement et optimisation contextuelle
    let result = translatedWords.join(' ');
    result = await this.optimizeTranslation(result, 'bariba');
    
    if (unmatchedWords.length > 0) {
      console.log(`⚠️ Mots non traduits: ${unmatchedWords.join(', ')}`);
    }
    
    console.log(`✅ Résultat: "${result}"`);
    return result;
  }

  async translateBaribaToFrench(text: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`🔄 Traduction Bààtɔ̀nú->FR: "${text}"`);
    
    // 1. Nettoyage et préparation du texte
    const cleanText = this.cleanText(text);
    const words = this.tokenize(cleanText);
    
    // 2. Traduction mot par mot avec le dictionnaire
    const translatedWords: string[] = [];
    const unmatchedWords: string[] = [];
    
    for (const word of words) {
      const translations = this.reversePatterns.get(word.toLowerCase());
      if (translations && translations.length > 0) {
        // Extraire le premier mot principal de la définition
        const mainWord = this.extractMainWord(translations[0]);
        translatedWords.push(mainWord);
      } else {
        // Essayer de trouver des mots similaires
        const similarWord = await this.findSimilarWord(word, 'bariba');
        if (similarWord) {
          const similarTranslations = this.reversePatterns.get(similarWord);
          if (similarTranslations) {
            const mainWord = this.extractMainWord(similarTranslations[0]);
            translatedWords.push(mainWord);
          } else {
            translatedWords.push(`[${word}]`);
            unmatchedWords.push(word);
          }
        } else {
          translatedWords.push(`[${word}]`);
          unmatchedWords.push(word);
        }
      }
    }
    
    // 3. Post-traitement et optimisation contextuelle
    let result = translatedWords.join(' ');
    result = await this.optimizeTranslation(result, 'french');
    
    if (unmatchedWords.length > 0) {
      console.log(`⚠️ Mots non traduits: ${unmatchedWords.join(', ')}`);
    }
    
    console.log(`✅ Résultat: "${result}"`);
    return result;
  }

  private extractFrenchWords(entry: DictionaryEntry): string[] {
    const words = new Set<string>();
    
    // Mots de la définition
    const definitionWords = entry.definition
      .toLowerCase()
      .replace(/[.,;:!?()[\]{}]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));
    
    definitionWords.forEach(word => words.add(word));
    
    // Mots-clés français
    entry.french_keywords?.forEach(keyword => {
      words.add(keyword.toLowerCase());
    });
    
    // Exemples français
    entry.example_francais?.forEach(example => {
      const exampleWords = example
        .toLowerCase()
        .replace(/[.,;:!?()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !this.isStopWord(word));
      
      exampleWords.forEach(word => words.add(word));
    });
    
    return Array.from(words);
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'est', 'sont', 'avec', 'pour', 'par', 'sur', 'dans', 'à', 'au', 'aux'];
    return stopWords.includes(word.toLowerCase());
  }

  // Nouvelles méthodes pour les règles linguistiques
  private applyPreTranslationRules(text: string, direction: 'french-to-bariba' | 'bariba-to-french'): string {
    if (direction === 'french-to-bariba') {
      // Remplacer les négations françaises
      text = text.replace(/ne\s+(\w+)\s+pas/g, (match, verb) => `kɑ ${verb} sɑ`);
      text = text.replace(/ne\s+(\w+)\s+plus/g, (match, verb) => `kɑ ${verb} gbenɑ`);
      text = text.replace(/ne\s+(\w+)\s+jamais/g, (match, verb) => `kɑ ${verb} dɑɑ`);
      
      // Gérer les articles définis/indéfinis
      text = text.replace(/\b(le|la)\s+/gi, 'u ');
      text = text.replace(/\bles\s+/gi, 'ba ');
      text = text.replace(/\b(un|une)\s+/gi, 'kɑ ');
      text = text.replace(/\bdes\s+/gi, 'ba ');
    }
    
    return text;
  }

  private applyLinguisticRulesForWord(word: string, direction: 'french-to-bariba' | 'bariba-to-french'): string | null {
    if (direction === 'french-to-bariba') {
      // Vérifier les pronoms
      if (this.linguisticRules.conjugations[word]) {
        return this.linguisticRules.conjugations[word];
      }
      
      // Vérifier les connecteurs
      if (this.linguisticRules.connectors[word]) {
        return this.linguisticRules.connectors[word];
      }
      
      // Vérifier les adjectifs
      if (this.linguisticRules.adjectives[word]) {
        return this.linguisticRules.adjectives[word];
      }
      
      // Vérifier les verbes courants
      if (this.linguisticRules.commonVerbs[word]) {
        return this.linguisticRules.commonVerbs[word];
      }
      
      // Vérifier les préfixes
      if (this.linguisticRules.prefixes[word]) {
        return this.linguisticRules.prefixes[word];
      }
    }
    
    return null;
  }

  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/["""'']/g, '"')
      .replace(/[…]/g, '...');
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,;:!?()[\]{}]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private extractMainWord(definition: string): string {
    // Extraire le premier mot significatif de la définition
    const words = definition
      .replace(/[.,;:!?()[\]{}]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));
    
    return words.length > 0 ? words[0] : definition.split(' ')[0];
  }

  private async findSimilarWord(word: string, language: 'french' | 'bariba'): Promise<string | null> {
    if (!this.sentenceTransformer || !this.wordEmbeddings.has(word.toLowerCase())) {
      // Fallback: recherche par similarité de caractères
      return this.findSimilarWordByString(word, language);
    }
    
    try {
      const wordEmbedding = this.wordEmbeddings.get(word.toLowerCase());
      if (!wordEmbedding) return null;
      
      let bestMatch: string | null = null;
      let bestSimilarity = 0.7; // Seuil minimum
      
      const patterns = language === 'french' ? this.translationPatterns : this.reversePatterns;
      
      for (const [candidate] of patterns) {
        const candidateEmbedding = this.wordEmbeddings.get(candidate);
        if (!candidateEmbedding) continue;
        
        const similarity = this.cosineSimilarity(wordEmbedding, candidateEmbedding);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = candidate;
        }
      }
      
      return bestMatch;
    } catch (error) {
      console.warn("Erreur dans findSimilarWord:", error);
      return this.findSimilarWordByString(word, language);
    }
  }

  private findSimilarWordByString(word: string, language: 'french' | 'bariba'): string | null {
    const patterns = language === 'french' ? this.translationPatterns : this.reversePatterns;
    const candidates = Array.from(patterns.keys());
    
    let bestMatch: string | null = null;
    let bestScore = 0.7; // Seuil minimum
    
    for (const candidate of candidates) {
      const score = this.levenshteinSimilarity(word.toLowerCase(), candidate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
    
    return bestMatch;
  }

  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    
    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }

  private async optimizeTranslation(translation: string, targetLanguage: 'french' | 'bariba'): Promise<string> {
    // Post-traitement pour améliorer la fluidité
    let optimized = translation;
    
    // Supprimer les mots dupliqués consécutifs
    optimized = optimized.replace(/\b(\w+)\s+\1\b/g, '$1');
    
    // Améliorer la ponctuation
    optimized = optimized.replace(/\s+([.,;:!?])/g, '$1');
    optimized = optimized.replace(/([.,;:!?])\s*([.,;:!?])/g, '$1 $2');
    
    return optimized.trim();
  }

  get isReady(): boolean {
    return this.isInitialized;
  }
}