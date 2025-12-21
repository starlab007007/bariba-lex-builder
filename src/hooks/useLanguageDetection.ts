import { useCallback } from 'react';

// Common Bariba words, characters and patterns
const BARIBA_INDICATORS = [
  // Common words
  'kparo', 'wiru', 'boko', 'suru', 'giri', 'yeru', 'tɔnɔ', 'wɛru',
  'koo', 'doo', 'sɔɔ', 'naa', 'baa', 'waa', 'gaa', 'daa',
  'kpe', 'gbe', 'ɲa', 'ɲɔ', 'dɔ', 'tɔ', 'sɔ', 'wɔ',
  'wɛrɛ', 'kɔni', 'dendi', 'baru', 'sunu', 'wɔri',
  // Pronouns and particles
  'n', 'a', 'u', 'ba', 'bu', 'be', 'bi', 'bɛ',
  // Common verbs
  'dɔ', 'yɛ', 'ka', 'ko', 'ku', 'da', 'de', 'di',
  // Greetings
  'alafia', 'ka kparo', 'a tɔn', 'n tɔn',
  // Question words
  'mɛ', 'nɛ', 'bera', 'yibu',
];

// Bariba-specific character patterns
const BARIBA_CHARS = ['ɔ', 'ɛ', 'ŋ', 'ɲ', 'ɓ', 'ɗ', 'ʃ'];
const BARIBA_TONE_PATTERNS = /[àáâãäèéêëìíîïòóôõöùúûü]/gi;

// French indicators
const FRENCH_INDICATORS = [
  // Common words
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
  'est', 'sont', 'suis', 'êtes', 'sommes',
  'et', 'ou', 'mais', 'donc', 'car', 'ni',
  'pour', 'dans', 'sur', 'sous', 'avec', 'sans',
  'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
  'qui', 'que', 'quoi', 'comment', 'pourquoi', 'quand', 'où',
  'faire', 'avoir', 'être', 'aller', 'venir', 'voir', 'dire',
  'bonjour', 'bonsoir', 'salut', 'merci', 'oui', 'non',
  // French-specific patterns
  "c'est", "j'ai", "n'est", "qu'est", "d'accord",
];

// French-specific character patterns
const FRENCH_CHARS = ['ç', 'œ', 'æ'];
const FRENCH_ACCENTS = /[àâäéèêëïîôùûüÿ]/gi;

export type DetectedLanguage = 'bariba' | 'french' | 'unknown';

interface DetectionResult {
  language: DetectedLanguage;
  confidence: number;
  baribaScore: number;
  frenchScore: number;
}

export const useLanguageDetection = () => {
  const detectLanguage = useCallback((text: string): DetectionResult => {
    if (!text || text.trim().length === 0) {
      return { language: 'unknown', confidence: 0, baribaScore: 0, frenchScore: 0 };
    }

    const normalizedText = text.toLowerCase().trim();
    const words = normalizedText.split(/\s+/);
    
    let baribaScore = 0;
    let frenchScore = 0;

    // Check for Bariba-specific characters (strong indicator)
    BARIBA_CHARS.forEach(char => {
      if (normalizedText.includes(char)) {
        baribaScore += 3;
      }
    });

    // Check for French-specific characters
    FRENCH_CHARS.forEach(char => {
      if (normalizedText.includes(char)) {
        frenchScore += 2;
      }
    });

    // Check for Bariba tone patterns
    const baribaTones = normalizedText.match(BARIBA_TONE_PATTERNS);
    if (baribaTones) {
      baribaScore += baribaTones.length * 0.5;
    }

    // Check for French accent patterns
    const frenchAccents = normalizedText.match(FRENCH_ACCENTS);
    if (frenchAccents) {
      frenchScore += frenchAccents.length * 0.3;
    }

    // Check word matches
    words.forEach(word => {
      const cleanWord = word.replace(/[.,!?;:'"]/g, '');
      
      if (BARIBA_INDICATORS.includes(cleanWord)) {
        baribaScore += 2;
      }
      
      if (FRENCH_INDICATORS.includes(cleanWord)) {
        frenchScore += 2;
      }
    });

    // Check for common French patterns (apostrophes, specific bigrams)
    if (/[a-z]'[a-z]/i.test(normalizedText)) {
      frenchScore += 2; // French uses lots of apostrophes
    }

    // Check word structure patterns
    // Bariba tends to have more CV (consonant-vowel) patterns
    // French has more complex consonant clusters
    const consonantClusters = normalizedText.match(/[bcdfghjklmnpqrstvwxz]{3,}/gi);
    if (consonantClusters && consonantClusters.length > 0) {
      frenchScore += consonantClusters.length;
    }

    // Calculate total and confidence
    const totalScore = baribaScore + frenchScore;
    
    if (totalScore === 0) {
      // If no indicators found, default based on common character patterns
      const hasCommonFrenchPattern = /^(le|la|les|un|une|je|tu|il|nous|vous)\s/i.test(normalizedText);
      if (hasCommonFrenchPattern) {
        return { language: 'french', confidence: 0.5, baribaScore: 0, frenchScore: 1 };
      }
      return { language: 'unknown', confidence: 0, baribaScore: 0, frenchScore: 0 };
    }

    const confidence = Math.abs(baribaScore - frenchScore) / totalScore;
    
    if (baribaScore > frenchScore) {
      return { 
        language: 'bariba', 
        confidence: Math.min(0.95, 0.5 + confidence * 0.5),
        baribaScore,
        frenchScore
      };
    } else if (frenchScore > baribaScore) {
      return { 
        language: 'french', 
        confidence: Math.min(0.95, 0.5 + confidence * 0.5),
        baribaScore,
        frenchScore
      };
    } else {
      // Equal scores - default to French as it's more common
      return { 
        language: 'french', 
        confidence: 0.5,
        baribaScore,
        frenchScore
      };
    }
  }, []);

  const isBariba = useCallback((text: string): boolean => {
    const result = detectLanguage(text);
    return result.language === 'bariba' && result.confidence > 0.5;
  }, [detectLanguage]);

  const isFrench = useCallback((text: string): boolean => {
    const result = detectLanguage(text);
    return result.language === 'french' && result.confidence > 0.5;
  }, [detectLanguage]);

  return {
    detectLanguage,
    isBariba,
    isFrench
  };
};
