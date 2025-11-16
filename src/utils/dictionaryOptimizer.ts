/**
 * Utilitaires pour l'optimisation et l'analyse du dictionnaire
 */

import { DictionaryEntry } from "@/data/fullDictionaryData";

export interface DictionaryQualityMetrics {
  totalEntries: number;
  entriesWithPhonetic: number;
  entriesWithExamples: number;
  entriesWithVariants: number;
  averageKeywordsPerEntry: number;
  completenessScore: number; // 0-100
  qualityScore: number; // 0-100
}

export interface EntryQuality {
  entry: DictionaryEntry;
  completenessScore: number;
  issues: string[];
  suggestions: string[];
}

/**
 * Calcule les métriques de qualité du dictionnaire
 */
export function analyzeDictionaryQuality(entries: DictionaryEntry[]): DictionaryQualityMetrics {
  const totalEntries = entries.length;
  let entriesWithPhonetic = 0;
  let entriesWithExamples = 0;
  let entriesWithVariants = 0;
  let totalKeywords = 0;

  entries.forEach(entry => {
    if (entry.phonetic && entry.phonetic.trim().length > 0) {
      entriesWithPhonetic++;
    }
    if (entry.example_bariba.length > 0 || entry.example_francais.length > 0) {
      entriesWithExamples++;
    }
    if (entry.variants && entry.variants.length > 0) {
      entriesWithVariants++;
    }
    totalKeywords += (entry.french_keywords?.length || 0);
  });

  const averageKeywordsPerEntry = totalKeywords / totalEntries;
  
  // Score de complétude (0-100)
  const phoneticRate = (entriesWithPhonetic / totalEntries) * 100;
  const exampleRate = (entriesWithExamples / totalEntries) * 100;
  const variantRate = (entriesWithVariants / totalEntries) * 100;
  const completenessScore = (phoneticRate + exampleRate + variantRate) / 3;

  // Score de qualité global (0-100)
  const qualityScore = (
    completenessScore * 0.4 + // 40% complétude
    Math.min(averageKeywordsPerEntry / 10, 1) * 100 * 0.3 + // 30% richesse des mots-clés
    (entriesWithExamples / totalEntries) * 100 * 0.3 // 30% exemples
  );

  return {
    totalEntries,
    entriesWithPhonetic,
    entriesWithExamples,
    entriesWithVariants,
    averageKeywordsPerEntry,
    completenessScore,
    qualityScore
  };
}

/**
 * Analyse la qualité d'une entrée individuelle
 */
export function analyzeEntryQuality(entry: DictionaryEntry): EntryQuality {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Vérifier la phonétique
  if (!entry.phonetic || entry.phonetic.trim().length === 0) {
    issues.push("Phonétique manquante");
    suggestions.push("Ajouter la transcription phonétique du mot");
    score -= 20;
  }

  // Vérifier les exemples
  if (entry.example_bariba.length === 0) {
    issues.push("Aucun exemple en Bààtɔ̀nú");
    suggestions.push("Ajouter au moins un exemple d'utilisation en Bààtɔ̀nú");
    score -= 15;
  }

  if (entry.example_francais.length === 0) {
    issues.push("Aucun exemple en français");
    suggestions.push("Ajouter la traduction française des exemples");
    score -= 15;
  }

  // Vérifier la définition
  if (entry.definition.length < 10) {
    issues.push("Définition trop courte");
    suggestions.push("Enrichir la définition avec plus de détails");
    score -= 10;
  }

  // Vérifier les mots-clés
  if (!entry.french_keywords || entry.french_keywords.length < 3) {
    issues.push("Peu de mots-clés français");
    suggestions.push("Ajouter plus de mots-clés pour améliorer la recherche");
    score -= 10;
  }

  // Vérifier les variantes
  if (entry.word.includes('/') && (!entry.variants || entry.variants.length === 0)) {
    issues.push("Variantes non extraites");
    suggestions.push("Séparer et indexer les variantes du mot");
    score -= 10;
  }

  // Vérifier la cohérence exemples bariba/français
  if (entry.example_bariba.length !== entry.example_francais.length) {
    issues.push("Incohérence entre exemples Bààtɔ̀nú et français");
    suggestions.push("Assurer que chaque exemple Bààtɔ̀nú a sa traduction française");
    score -= 15;
  }

  return {
    entry,
    completenessScore: Math.max(0, score),
    issues,
    suggestions
  };
}

/**
 * Trouve les entrées similaires (potentiels doublons)
 */
export function findSimilarEntries(
  entry: DictionaryEntry,
  allEntries: DictionaryEntry[],
  threshold: number = 0.8
): DictionaryEntry[] {
  const similar: DictionaryEntry[] = [];
  const entryWordLower = entry.word.toLowerCase();

  allEntries.forEach(other => {
    if (other.word === entry.word) return; // Ignorer l'entrée elle-même

    const otherWordLower = other.word.toLowerCase();
    
    // Vérifier similarité orthographique
    const similarity = calculateSimilarity(entryWordLower, otherWordLower);
    
    if (similarity >= threshold) {
      similar.push(other);
    }
  });

  return similar;
}

/**
 * Calcule la similarité entre deux chaînes (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calcule la distance de Levenshtein
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[str1.length][str2.length];
}

/**
 * Exporte le dictionnaire optimisé au format JSON
 */
export function exportOptimizedDictionary(entries: DictionaryEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

/**
 * Suggère des améliorations pour une liste d'entrées
 */
export function suggestImprovements(entries: DictionaryEntry[]): {
  lowQualityEntries: EntryQuality[];
  potentialDuplicates: { entry: DictionaryEntry; similar: DictionaryEntry[] }[];
  overallMetrics: DictionaryQualityMetrics;
} {
  const lowQualityEntries: EntryQuality[] = [];
  const potentialDuplicates: { entry: DictionaryEntry; similar: DictionaryEntry[] }[] = [];

  // Analyser chaque entrée
  entries.forEach(entry => {
    const quality = analyzeEntryQuality(entry);
    if (quality.completenessScore < 70) {
      lowQualityEntries.push(quality);
    }

    // Vérifier les doublons potentiels (seulement pour un échantillon pour éviter O(n²))
    if (entries.length < 1000 || Math.random() < 0.1) {
      const similar = findSimilarEntries(entry, entries, 0.85);
      if (similar.length > 0) {
        potentialDuplicates.push({ entry, similar });
      }
    }
  });

  const overallMetrics = analyzeDictionaryQuality(entries);

  return {
    lowQualityEntries: lowQualityEntries.sort((a, b) => a.completenessScore - b.completenessScore),
    potentialDuplicates,
    overallMetrics
  };
}
