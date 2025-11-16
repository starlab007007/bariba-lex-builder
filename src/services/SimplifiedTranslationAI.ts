import { type DictionaryEntry } from "@/data/fullDictionaryData";

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
  private frenchToBariba: Map<string, string[]> = new Map();
  private baribaToFrench: Map<string, string[]> = new Map();
  private commonPhrases: Map<string, string> = new Map();
  private isInitialized = false;

  constructor(entries: DictionaryEntry[]) {
    this.dictionaryEntries = entries;
    this.initialize();
  }

  private initialize(): void {
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
   * Traduit du français vers le bariba
   */
  async translateFrenchToBariba(text: string): Promise<TranslationResult> {
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
    
    // Vérifier les phrases communes inversées
    for (const [french, bariba] of this.commonPhrases) {
      if (cleanText.includes(bariba)) {
        return {
          translation: french,
          confidence: 1.0,
          detectedLanguage: 'bariba'
        };
      }
    }

    // Traduction mot par mot avec fuzzy matching
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

  get isReady(): boolean {
    return this.isInitialized;
  }
}
