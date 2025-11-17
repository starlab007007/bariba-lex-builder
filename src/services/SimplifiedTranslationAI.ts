import type { DictionaryEntry } from "@/data/fullDictionaryData";
import type { BiblicalPhrase, DictionaryExample } from "@/data/enhancedDictionaryLoader";
import { BaatonumTokenizer } from "./BaatonumTokenizer";
import { LinguisticEngine } from "./LinguisticEngine";
import { grammaticalCorrector } from "./GrammaticalCorrector";
import { loadEnhancedCorpus, searchCorpusBySimilarity, type EnhancedCorpus } from "@/data/enhancedCorpusLoader";
import { idiomService } from "./IdiomService";
import { translationContextService } from "./TranslationContextService";

/**
 * Service de traduction simplifié et robuste
 * - Fonctionne sans dépendances lourdes
 * - Gère les fautes d'orthographe (fuzzy matching)
 * - Détection automatique de la langue
 * - Suggestions de phrases en temps réel
 */

export interface TranslationResult {
  translation: string;
  confidence: number;
  detectedLanguage: 'french' | 'bariba' | 'mixed';
  suggestions?: string[];
}

export class SimplifiedTranslationAI {
  private dictionaryEntries: DictionaryEntry[] = [];
  private isInitialized = false;

  // INDEX POUR TRADUCTION DE PHRASES COMPLÈTES
  private phrasePatterns: Map<string, string> = new Map(); // Français -> Bariba (phrases)
  private baribaToFrenchPhrases: Map<string, string> = new Map(); // Bariba -> Français (phrases)
  private phraseIndex: Map<string, Set<string>> = new Map(); // Mot-clé -> Phrases contenant ce mot
  private examplePairs: Map<string, string> = new Map(); // Exemples du dictionnaire

  // INDEX POUR TRADUCTION MOT-À-MOT
  private frenchToBariba: Map<string, string[]> = new Map();
  private baribaToFrench: Map<string, string[]> = new Map();
  private commonPhrases: Map<string, string> = new Map();

  // MODULES LINGUISTIQUES
  private tokenizer: BaatonumTokenizer | null = null;
  private linguisticEngine: LinguisticEngine;
  private enhancedCorpus: EnhancedCorpus | null = null;

  // STATISTIQUES
  public isReady = false;

  constructor(entries: DictionaryEntry[], phrases: BiblicalPhrase[], examples: DictionaryExample[]) {
    this.dictionaryEntries = entries;
    this.linguisticEngine = new LinguisticEngine();
    this.initialize(phrases, examples);
  }

  private initialize(phrases: BiblicalPhrase[], examples: DictionaryExample[]): void {
    console.log("🚀 Entraînement du traducteur sur TOUTES les données...");
    
    const startTime = Date.now();

    // ÉTAPE 1 : Charger les 152,000+ phrases bibliques
    this.loadBiblicalPhrases(phrases);
    
    // ÉTAPE 2 : Charger les exemples du dictionnaire
    this.loadDictionaryExamples(examples);
    
    // ÉTAPE 3 : Construire l'index mot-à-mot (code existant)
    this.buildWordIndex();
    
    // ÉTAPE 4 : Construire l'index de recherche rapide de phrases
    this.buildPhraseIndex();
    
    // ÉTAPE 5 : Initialiser le tokenizer Baatɔnum
    const allBaribaTexts = this.extractAllBaribaTexts();
    this.tokenizer = new BaatonumTokenizer(allBaribaTexts);

    // ÉTAPE 6 : Charger le corpus enrichi (Phase 1 du rapport technique)
    this.loadEnhancedCorpusAsync();

    const duration = Date.now() - startTime;

    // LOGS DE VALIDATION
    console.log("📊 Statistiques d'entraînement :");
    console.log(`  ✅ Entrées dictionnaire : ${this.dictionaryEntries.length}`);
    console.log(`  ✅ Phrases complètes (FR->BBA) : ${this.phrasePatterns.size}`);
    console.log(`  ✅ Phrases complètes (BBA->FR) : ${this.baribaToFrenchPhrases.size}`);
    console.log(`  ✅ Exemples du dictionnaire : ${this.examplePairs.size}`);
    console.log(`  ✅ Index mots français : ${this.frenchToBariba.size}`);
    console.log(`  ✅ Index mots bariba : ${this.baribaToFrench.size}`);
    console.log(`  ✅ Vocabulaire tokenizer : ${this.tokenizer.getVocabularySize()} tokens`);
    console.log(`  ✅ Index de phrases : ${this.phraseIndex.size} mots-clés`);
    console.log(`  ⏱️ Temps d'entraînement : ${duration}ms`);
    
    this.isInitialized = true;
    this.isReady = true;
    console.log("✅ Traducteur COMPLÈTEMENT entraîné et prêt !");
  }

  /**
   * Charge le corpus enrichi de manière asynchrone (Phase 1 du rapport)
   */
  private async loadEnhancedCorpusAsync(): Promise<void> {
    try {
      console.log("📚 Chargement du corpus enrichi avec 2669+ paires...");
      this.enhancedCorpus = await loadEnhancedCorpus();
      console.log(`✅ Corpus enrichi chargé: ${this.enhancedCorpus.totalPairs} paires`);
      console.log(`📊 Catégories disponibles:`, Object.keys(this.enhancedCorpus.categoryCounts).length);
    } catch (error) {
      console.warn('⚠️ Impossible de charger le corpus enrichi:', error);
    }
  }

  /**
   * Initialisation complète avec idiomes et contexte (Phase 5 du rapport)
   */
  async initializeAdvancedFeatures(): Promise<void> {
    try {
      await Promise.all([
        idiomService.loadIdioms(),
        translationContextService.loadRecentContext()
      ]);
      console.log(`✅ Fonctionnalités avancées initialisées`);
      console.log(`  - ${idiomService.getIdiomCount()} idiomes chargés`);
      console.log(`  - ${translationContextService.getContextSize()} entrées contextuelles`);
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation avancée:", error);
    }
  }

  /**
   * Extraire tous les textes Bariba pour le tokenizer
   */
  private extractAllBaribaTexts(): string[] {
    const texts: string[] = [];
    
    // Textes des phrases bibliques
    for (const [, bariba] of this.phrasePatterns) {
      texts.push(bariba);
    }
    
    // Textes des exemples
    this.dictionaryEntries.forEach(entry => {
      entry.example_bariba.forEach(ex => texts.push(ex));
    });
    
    return texts;
  }

  /**
   * Charger les phrases bibliques (152k+)
   */
  private loadBiblicalPhrases(phrases: BiblicalPhrase[]): void {
    phrases.forEach(phrase => {
      const frenchKey = phrase.french.toLowerCase().trim();
      const baribaKey = phrase.bariba.toLowerCase().trim();
      
      // Français -> Bariba
      this.phrasePatterns.set(frenchKey, phrase.bariba);
      
      // Bariba -> Français
      this.baribaToFrenchPhrases.set(baribaKey, phrase.french);
    });
    
    console.log(`✅ ${phrases.length} phrases bibliques chargées`);
  }

  /**
   * Charger les exemples du dictionnaire
   */
  private loadDictionaryExamples(examples: DictionaryExample[]): void {
    examples.forEach(ex => {
      if (ex.french && ex.bariba) {
        const frenchKey = ex.french.toLowerCase().trim();
        const baribaKey = ex.bariba.toLowerCase().trim();
        
        // Bidirectionnel
        this.examplePairs.set(frenchKey, ex.bariba);
        this.examplePairs.set(baribaKey, ex.french);
      }
    });
    
    console.log(`✅ ${examples.length} paires d'exemples chargées`);
  }

  /**
   * Construire l'index mot-à-mot (code existant amélioré)
   */
  private buildWordIndex(): void {
    console.log("🚀 Initialisation du traducteur simplifié...");

    // Construire les index de traduction
    this.dictionaryEntries.forEach(entry => {
      const baribaWord = entry.word.toLowerCase();
      const frenchWords = [
        ...entry.definition.toLowerCase().split(/[\s,;]+/),
        ...(entry.french_keywords || []).map(k => k.toLowerCase())
      ].filter(w => w.length > 2);

      // Index Bariba -> Français
      if (!this.baribaToFrench.has(baribaWord)) {
        this.baribaToFrench.set(baribaWord, []);
      }
      this.baribaToFrench.get(baribaWord)!.push(entry.definition);

      // Index Français -> Bariba
      frenchWords.forEach(frWord => {
        if (!this.frenchToBariba.has(frWord)) {
          this.frenchToBariba.set(frWord, []);
        }
        if (!this.frenchToBariba.get(frWord)!.includes(baribaWord)) {
          this.frenchToBariba.get(frWord)!.push(baribaWord);
        }
      });

      // Variantes du mot bariba
      entry.variants?.forEach(variant => {
        const v = variant.toLowerCase();
        if (!this.baribaToFrench.has(v)) {
          this.baribaToFrench.set(v, []);
        }
        this.baribaToFrench.get(v)!.push(entry.definition);
      });
    });

    // Phrases communes
    this.commonPhrases.set("bonjour", "aagu");
    this.commonPhrases.set("comment allez-vous", "foo ka bani");
    this.commonPhrases.set("comment vas-tu", "foo ka bani");
    this.commonPhrases.set("ça va", "ka bani");
    this.commonPhrases.set("merci", "gando");
    this.commonPhrases.set("s'il vous plaît", "doo gɔɔ");
    this.commonPhrases.set("au revoir", "ka sooru");
    this.commonPhrases.set("bonne nuit", "ka waa nɔɔra");
    this.commonPhrases.set("je vais bien", "n de bani gandi");
    this.commonPhrases.set("je m'appelle", "n yɔɔ");

    this.isInitialized = true;
    console.log("✅ Traducteur initialisé avec succès!");
  }

  /**
   * Construire l'index de recherche rapide de phrases
   */
  private buildPhraseIndex(): void {
    // Indexer les phrases françaises
    for (const [frenchPhrase] of this.phrasePatterns) {
      const words = frenchPhrase.split(/\s+/).filter(w => w.length > 2);
      
      words.forEach(word => {
        if (!this.phraseIndex.has(word)) {
          this.phraseIndex.set(word, new Set());
        }
        this.phraseIndex.get(word)!.add(frenchPhrase);
      });
    }

    // Indexer les exemples français  
    for (const [text] of this.examplePairs) {
      const words = text.split(/\s+/).filter(w => w.length > 2);
      
      words.forEach(word => {
        if (!this.phraseIndex.has(word)) {
          this.phraseIndex.set(word, new Set());
        }
        this.phraseIndex.get(word)!.add(text);
      });
    }
    
    console.log(`✅ Index de phrases construit avec ${this.phraseIndex.size} mots-clés`);
  }

  /**
   * Détecte automatiquement la langue du texte
   */
  detectLanguage(text: string): 'french' | 'bariba' | 'mixed' {
    const cleanText = text.toLowerCase().trim();
    
    // Caractères spécifiques au bariba
    const baribaChars = /[ɔɛáàãéèẽíìĩóòõúùũɛ̃ɔ̃ŋ]/i;
    if (baribaChars.test(text)) {
      return 'bariba';
    }

    // Mots français courants
    const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'est', 'sont', 'avec', 'pour', 'dans'];
    const words = cleanText.split(/\s+/);
    const frenchCount = words.filter(w => frenchWords.includes(w)).length;

    // Vérifier si le texte contient des mots du dictionnaire
    let baribaMatches = 0;
    let frenchMatches = 0;

    words.forEach(word => {
      if (this.baribaToFrench.has(word)) baribaMatches++;
      if (this.frenchToBariba.has(word)) frenchMatches++;
    });

    if (baribaMatches > frenchMatches || frenchCount === 0) {
      return 'bariba';
    }
    
    if (frenchMatches > baribaMatches || frenchCount > 0) {
      return 'french';
    }

    return 'mixed';
  }

  /**
   * Calcule la distance de Levenshtein pour la correspondance floue
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Trouve le meilleur match avec tolérance aux fautes
   */
  private findBestMatch(word: string, dictionary: Map<string, string[]>, threshold: number = 2): string | null {
    word = word.toLowerCase();
    
    // Correspondance exacte d'abord
    if (dictionary.has(word)) {
      return word;
    }

    // Recherche floue
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const [key] of dictionary) {
      const distance = this.levenshteinDistance(word, key);
      if (distance <= threshold && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = key;
      }
    }

    return bestMatch;
  }

  /**
   * Traduit du français vers le bariba avec correction grammaticale
   */
  async translateFrenchToBariba(text: string): Promise<TranslationResult> {
    if (!this.isInitialized) {
      throw new Error("Traducteur non initialisé");
    }

    const cleanText = text.toLowerCase().trim();
    
    // NIVEAU 1 : Recherche de phrase complète EXACTE
    if (this.phrasePatterns.has(cleanText)) {
      const translation = this.phrasePatterns.get(cleanText)!;
      // Appliquer la correction grammaticale (Phase 2 du rapport)
      const corrected = grammaticalCorrector.correctSentence(translation);
      return {
        translation: corrected,
        confidence: 1.0,
        detectedLanguage: 'french'
      };
    }

    // Vérifier aussi dans les exemples
    if (this.examplePairs.has(cleanText)) {
      const translation = this.examplePairs.get(cleanText)!;
      const corrected = grammaticalCorrector.correctSentence(translation);
      return {
        translation: corrected,
        confidence: 0.95,
        detectedLanguage: 'french'
      };
    }
    
    // NIVEAU 2 : Recherche de phrase PARTIELLE (fuzzy matching)
    const fuzzyResult = this.findBestPhraseMatch(cleanText, 'french');
    if (fuzzyResult) {
      const corrected = grammaticalCorrector.correctSentence(fuzzyResult.translation);
      return {
        translation: corrected,
        confidence: fuzzyResult.confidence,
        detectedLanguage: 'french'
      };
    }

    // NIVEAU 3 : Recherche dans le corpus enrichi (Phase 1 du rapport)
    if (this.enhancedCorpus) {
      const similarPairs = searchCorpusBySimilarity(
        this.enhancedCorpus,
        cleanText,
        'french',
        1
      );

      if (similarPairs.length > 0) {
        console.log(`→ Correspondance trouvée dans le corpus enrichi`);
        const translation = similarPairs[0].bariba;
        const correctionResult = grammaticalCorrector.analyzeSentence(translation);
        
        return {
          translation: correctionResult.corrected,
          confidence: Math.min(0.85, correctionResult.confidence / 100),
          detectedLanguage: 'french'
        };
      }
    }
    
    // NIVEAU 4 : Traduction MOT-À-MOT avec correction grammaticale
    const wordByWord = this.translateWordByWord(text, 'french');
    const correctionResult = grammaticalCorrector.analyzeSentence(wordByWord.translation);
    
    return {
      translation: correctionResult.corrected,
      confidence: Math.min(wordByWord.confidence, correctionResult.confidence / 100),
      detectedLanguage: 'french'
    };
  }

  /**
   * Fuzzy matching sur les phrases (Jaccard similarity)
   */
  private findBestPhraseMatch(
    text: string,
    sourceLanguage: 'french' | 'bariba'
  ): { translation: string; confidence: number } | null {
    
    const words = new Set(text.split(/\s+/).filter(w => w.length > 2));
    if (words.size === 0) return null;
    
    // Récupérer les phrases candidates via l'index
    const candidates = new Set<string>();
    words.forEach(word => {
      const phrases = this.phraseIndex.get(word);
      if (phrases) {
        phrases.forEach(p => candidates.add(p));
      }
    });
    
    if (candidates.size === 0) return null;

    // Calculer la similarité de Jaccard
    let bestMatch: { phrase: string; similarity: number } | null = null;
    
    for (const candidatePhrase of candidates) {
      const candidateWords = new Set(candidatePhrase.split(/\s+/));
      
      // Jaccard similarity = intersection / union
      const intersection = new Set([...words].filter(w => candidateWords.has(w)));
      const union = new Set([...words, ...candidateWords]);
      const similarity = intersection.size / union.size;
      
      if (similarity > 0.6 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { phrase: candidatePhrase, similarity };
      }
    }
    
    if (bestMatch) {
      // Obtenir la traduction
      let translation: string | undefined;
      
      if (sourceLanguage === 'french') {
        translation = this.phrasePatterns.get(bestMatch.phrase) || this.examplePairs.get(bestMatch.phrase);
      } else {
        translation = this.baribaToFrenchPhrases.get(bestMatch.phrase) || this.examplePairs.get(bestMatch.phrase);
      }
      
      if (translation) {
        return {
          translation,
          confidence: bestMatch.similarity * 0.9 // Réduire légèrement pour indiquer le fuzzy
        };
      }
    }
    
    return null;
  }

  /**
   * Traduction mot-à-mot (méthode existante renommée)
   */
  private translateWordByWord(text: string, sourceLanguage: 'french' | 'bariba'): TranslationResult {
    const cleanText = text.toLowerCase().trim();
    
    // Vérifier les phrases communes d'abord
    for (const [french, bariba] of this.commonPhrases) {
      if (cleanText.includes(french)) {
        return {
          translation: bariba,
          confidence: 1.0,
          detectedLanguage: 'french'
        };
      }
    }

    // Traduction mot par mot avec fuzzy matching
    const words = cleanText.split(/\s+/);
    const translatedWords: string[] = [];
    let totalConfidence = 0;

    for (const word of words) {
      const cleanWord = word.replace(/[.,;!?]/g, '');
      
      // Essayer correspondance exacte
      let match = cleanWord;
      let confidence = 1.0;

      // Si pas de correspondance exacte, chercher avec fuzzy matching
      if (!this.frenchToBariba.has(match)) {
        const fuzzyMatch = this.findBestMatch(cleanWord, this.frenchToBariba, 2);
        if (fuzzyMatch) {
          match = fuzzyMatch;
          confidence = 0.8; // Confiance réduite pour fuzzy match
        }
      }

      const translations = this.frenchToBariba.get(match);
      if (translations && translations.length > 0) {
        translatedWords.push(translations[0]);
        totalConfidence += confidence;
      } else {
        translatedWords.push(`[${cleanWord}]`);
        totalConfidence += 0.3;
      }
    }

    const avgConfidence = words.length > 0 ? totalConfidence / words.length : 0;

    return {
      translation: translatedWords.join(' '),
      confidence: avgConfidence,
      detectedLanguage: 'french'
    };
  }

  /**
   * Traduit du bariba vers le français
   */
  async translateBaribaToFrench(text: string): Promise<TranslationResult> {
    const cleanText = text.toLowerCase().trim();
    
    // NIVEAU 1 : Recherche exacte dans les phrases
    if (this.baribaToFrenchPhrases.has(cleanText)) {
      return {
        translation: this.baribaToFrenchPhrases.get(cleanText)!,
        confidence: 1.0,
        detectedLanguage: 'bariba'
      };
    }

    // NIVEAU 2 : Fuzzy matching
    const fuzzyResult = this.findBestPhraseMatch(cleanText, 'bariba');
    if (fuzzyResult) {
      return {
        translation: fuzzyResult.translation,
        confidence: fuzzyResult.confidence,
        detectedLanguage: 'bariba'
      };
    }

    // NIVEAU 3 : Corpus enrichi
    if (this.enhancedCorpus) {
      const similarPairs = searchCorpusBySimilarity(this.enhancedCorpus, cleanText, 'bariba', 1);
      if (similarPairs.length > 0) {
        return {
          translation: similarPairs[0].french,
          confidence: 0.85,
          detectedLanguage: 'bariba'
        };
      }
    }

    // NIVEAU 4 : Traduction mot par mot
    const words = cleanText.split(/\s+/);
    const translatedWords: string[] = [];
    let totalConfidence = 0;

    for (const word of words) {
      const cleanWord = word.replace(/[.,;!?]/g, '');
      
      let match = cleanWord;
      let confidence = 1.0;

      // Si pas de correspondance exacte, chercher avec fuzzy matching
      if (!this.baribaToFrench.has(match)) {
        const fuzzyMatch = this.findBestMatch(cleanWord, this.baribaToFrench, 2);
        if (fuzzyMatch) {
          match = fuzzyMatch;
          confidence = 0.8;
        }
      }

      const translations = this.baribaToFrench.get(match);
      if (translations && translations.length > 0) {
        translatedWords.push(translations[0].split(',')[0].trim());
        totalConfidence += confidence;
      } else {
        translatedWords.push(`[${cleanWord}]`);
        totalConfidence += 0.3;
      }
    }

    const avgConfidence = words.length > 0 ? totalConfidence / words.length : 0;

    return {
      translation: translatedWords.join(' '),
      confidence: avgConfidence,
      detectedLanguage: 'bariba'
    };
  }

  /**
   * Traduction intelligente avec détection automatique
   */
  async translateIntelligent(text: string): Promise<TranslationResult> {
    const detectedLang = this.detectLanguage(text);
    
    if (detectedLang === 'french') {
      return await this.translateFrenchToBariba(text);
    } else {
      return await this.translateBaribaToFrench(text);
    }
  }

  /**
   * Génère des suggestions de phrases pendant la saisie
   */
  getSuggestions(text: string, maxSuggestions: number = 5): string[] {
    const cleanText = text.toLowerCase().trim();
    if (cleanText.length < 2) return [];

    const suggestions: string[] = [];
    const detectedLang = this.detectLanguage(text);

    // Suggestions de phrases communes
    if (detectedLang === 'french') {
      for (const [french] of this.commonPhrases) {
        if (french.startsWith(cleanText) && !suggestions.includes(french)) {
          suggestions.push(french);
        }
      }
    } else {
      for (const [, bariba] of this.commonPhrases) {
        if (bariba.startsWith(cleanText) && !suggestions.includes(bariba)) {
          suggestions.push(bariba);
        }
      }
    }

    // Suggestions basées sur les exemples du dictionnaire
    this.dictionaryEntries.forEach(entry => {
      if (suggestions.length >= maxSuggestions) return;

      if (detectedLang === 'french') {
        entry.example_francais?.forEach(example => {
          if (suggestions.length < maxSuggestions) {
            const exampleLower = example.toLowerCase();
            if (exampleLower.includes(cleanText) && !suggestions.includes(example)) {
              suggestions.push(example);
            }
          }
        });
      } else {
        entry.example_bariba?.forEach(example => {
          if (suggestions.length < maxSuggestions) {
            const exampleLower = example.toLowerCase();
            if (exampleLower.includes(cleanText) && !suggestions.includes(example)) {
              suggestions.push(example);
            }
          }
        });
      }
    });

    return suggestions.slice(0, maxSuggestions);
  }
}
