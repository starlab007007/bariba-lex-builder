import { type DictionaryEntry } from "@/data/fullDictionaryData";

// Calcul de la distance de Levenshtein pour détecter les fautes de frappe
function levenshteinDistance(str1: string, str2: string): number {
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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export interface SpellCheckResult {
  word: string;
  isCorrect: boolean;
  suggestions: SpellSuggestion[];
}

export interface SpellSuggestion {
  word: string;
  distance: number;
  type: "bariba" | "french";
  entry?: DictionaryEntry;
}

export class BaatonumSpellChecker {
  private baribaWords: Map<string, DictionaryEntry> = new Map();
  private frenchWords: Map<string, DictionaryEntry> = new Map();
  private maxDistance: number = 3; // Distance maximale pour les suggestions

  constructor(entries: DictionaryEntry[]) {
    this.buildWordIndex(entries);
  }

  private buildWordIndex(entries: DictionaryEntry[]) {
    entries.forEach(entry => {
      // Indexer les mots bariba
      const baribaWord = entry.word.toLowerCase();
      this.baribaWords.set(baribaWord, entry);

      // Indexer les variantes
      entry.variants?.forEach(variant => {
        this.baribaWords.set(variant.toLowerCase(), entry);
      });

      // Indexer les mots français
      entry.french_keywords?.forEach(keyword => {
        const frenchWord = keyword.toLowerCase();
        this.frenchWords.set(frenchWord, entry);
      });

      // Indexer les mots de la définition
      const definitionWords = entry.definition
        .toLowerCase()
        .split(/[,\s\-\.;:!?()]+/)
        .filter(word => word.length > 2);
      
      definitionWords.forEach(word => {
        if (!this.frenchWords.has(word)) {
          this.frenchWords.set(word, entry);
        }
      });
    });
  }

  // Détecter les mots avec fautes dans une phrase
  public findTypos(text: string, language: "bariba" | "french" = "french"): string[] {
    const words = text
      .toLowerCase()
      .split(/[,\s\-\.;:!?()]+/)
      .filter(word => word.length > 2);

    const dictionary = language === "bariba" ? this.baribaWords : this.frenchWords;
    const typos: string[] = [];

    words.forEach(word => {
      if (!dictionary.has(word)) {
        typos.push(word);
      }
    });

    return typos;
  }

  // Suggérer des corrections pour un mot mal écrit
  public suggestCorrections(word: string, language: "bariba" | "french" = "french", maxSuggestions: number = 5): SpellSuggestion[] {
    const dictionary = language === "bariba" ? this.baribaWords : this.frenchWords;
    const suggestions: SpellSuggestion[] = [];
    const wordLower = word.toLowerCase();

    // Chercher les mots similaires
    dictionary.forEach((entry, dictWord) => {
      const distance = levenshteinDistance(wordLower, dictWord);
      
      // Si la distance est acceptable et le mot est assez similaire
      if (distance > 0 && distance <= this.maxDistance) {
        suggestions.push({
          word: dictWord,
          distance,
          type: language,
          entry
        });
      }
    });

    // Trier par distance (les plus proches en premier)
    suggestions.sort((a, b) => a.distance - b.distance);

    return suggestions.slice(0, maxSuggestions);
  }

  // Vérifier un texte complet et retourner les résultats
  public checkText(text: string, language: "bariba" | "french" = "french"): SpellCheckResult[] {
    const words = text
      .toLowerCase()
      .split(/[,\s\-\.;:!?()]+/)
      .filter(word => word.length > 2);

    const dictionary = language === "bariba" ? this.baribaWords : this.frenchWords;
    const results: SpellCheckResult[] = [];

    words.forEach(word => {
      const isCorrect = dictionary.has(word);
      const suggestions = !isCorrect ? this.suggestCorrections(word, language) : [];

      results.push({
        word,
        isCorrect,
        suggestions
      });
    });

    return results;
  }

  // Obtenir des statistiques sur le texte
  public getTextStats(text: string, language: "bariba" | "french" = "french"): {
    totalWords: number;
    correctWords: number;
    typos: number;
    accuracy: number;
  } {
    const words = text
      .toLowerCase()
      .split(/[,\s\-\.;:!?()]+/)
      .filter(word => word.length > 2);

    const dictionary = language === "bariba" ? this.baribaWords : this.frenchWords;
    const correctWords = words.filter(word => dictionary.has(word)).length;

    return {
      totalWords: words.length,
      correctWords,
      typos: words.length - correctWords,
      accuracy: words.length > 0 ? (correctWords / words.length) * 100 : 100
    };
  }
}
