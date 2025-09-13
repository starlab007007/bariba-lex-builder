/**
 * Utilitaires pour la recherche bidirectionnelle dans le dictionnaire
 */

import { type DictionaryEntry } from "@/data/fullDictionaryData";

/**
 * Normalise une chaîne pour la recherche (retire les accents, met en minuscules)
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Retire les accents
}

/**
 * Extrait les mots-clés français d'une entrée de dictionnaire
 */
export function extractFrenchKeywords(entry: DictionaryEntry): string[] {
  const keywords = new Set<string>();

  // Mots de la définition
  const definitionWords = entry.definition
    .toLowerCase()
    .split(/[,\s\-\.;:!?()]+/)
    .filter(word => word.length > 2);
  
  definitionWords.forEach(word => keywords.add(word));

  // Mots des exemples français
  entry.example_francais.forEach(example => {
    const words = example
      .toLowerCase()
      .split(/[,\s\-\.;:!?()]+/)
      .filter(word => word.length > 2);
    words.forEach(word => keywords.add(word));
  });

  // Mots des notes
  if (entry.notes) {
    const noteWords = entry.notes
      .toLowerCase()
      .split(/[,\s\-\.;:!?()]+/)
      .filter(word => word.length > 2);
    noteWords.forEach(word => keywords.add(word));
  }

  return Array.from(keywords);
}

/**
 * Calcule le score de pertinence d'une entrée pour une requête donnée
 */
export function calculateRelevanceScore(
  entry: DictionaryEntry, 
  query: string, 
  searchDirection: "bariba-to-french" | "french-to-bariba" | "all"
): number {
  const normalizedQuery = normalizeString(query);
  let score = 0;

  // Score élevé pour correspondance exacte du mot
  if (normalizeString(entry.word) === normalizedQuery) {
    score += 100;
  }

  // Score moyen pour mot qui commence par la requête
  if (normalizeString(entry.word).startsWith(normalizedQuery)) {
    score += 50;
  }

  // Score pour mot qui contient la requête
  if (normalizeString(entry.word).includes(normalizedQuery)) {
    score += 25;
  }

  // Score pour variantes
  entry.variants.forEach(variant => {
    if (normalizeString(variant) === normalizedQuery) {
      score += 80;
    } else if (normalizeString(variant).startsWith(normalizedQuery)) {
      score += 40;
    } else if (normalizeString(variant).includes(normalizedQuery)) {
      score += 20;
    }
  });

  // Score pour phonétique
  if (entry.phonetic && normalizeString(entry.phonetic).includes(normalizedQuery)) {
    score += 30;
  }

  // Score pour définition
  if (normalizeString(entry.definition).includes(normalizedQuery)) {
    score += 15;
  }

  // Score pour exemples
  entry.example_bariba.forEach(example => {
    if (normalizeString(example).includes(normalizedQuery)) {
      score += 10;
    }
  });

  entry.example_francais.forEach(example => {
    if (normalizeString(example).includes(normalizedQuery)) {
      score += 10;
    }
  });

  // Score pour mots-clés français
  entry.french_keywords.forEach(keyword => {
    if (normalizeString(keyword) === normalizedQuery) {
      score += 60;
    } else if (normalizeString(keyword).startsWith(normalizedQuery)) {
      score += 30;
    } else if (normalizeString(keyword).includes(normalizedQuery)) {
      score += 15;
    }
  });

  return score;
}

/**
 * Met en évidence les termes de recherche dans un texte
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const normalizedQuery = normalizeString(query);
  const regex = new RegExp(`(${normalizedQuery})`, "gi");
  
  return text.replace(regex, '<mark class="bg-accent/30 text-accent-foreground">$1</mark>');
}

/**
 * Suggère des termes de recherche basés sur la requête actuelle
 */
export function getSuggestions(
  query: string,
  entries: DictionaryEntry[],
  maxSuggestions: number = 5
): string[] {
  if (!query.trim() || query.length < 2) return [];

  const normalizedQuery = normalizeString(query);
  const suggestions = new Set<string>();

  entries.forEach(entry => {
    // Suggestions basées sur les mots bariba
    if (normalizeString(entry.word).startsWith(normalizedQuery)) {
      suggestions.add(entry.word);
    }

    // Suggestions basées sur les variantes
    entry.variants.forEach(variant => {
      if (normalizeString(variant).startsWith(normalizedQuery)) {
        suggestions.add(variant);
      }
    });

    // Suggestions basées sur les mots-clés français
    entry.french_keywords.forEach(keyword => {
      if (normalizeString(keyword).startsWith(normalizedQuery)) {
        suggestions.add(keyword);
      }
    });
  });

  return Array.from(suggestions)
    .slice(0, maxSuggestions)
    .sort((a, b) => a.length - b.length); // Plus courts en premier
}

/**
 * Groupe les entrées par catégorie grammaticale
 */
export function groupByPartOfSpeech(entries: DictionaryEntry[]): Record<string, DictionaryEntry[]> {
  const groups: Record<string, DictionaryEntry[]> = {};

  entries.forEach(entry => {
    const pos = entry.part_of_speech;
    if (!groups[pos]) {
      groups[pos] = [];
    }
    groups[pos].push(entry);
  });

  return groups;
}

/**
 * Filtre les entrées par catégorie grammaticale
 */
export function filterByPartOfSpeech(
  entries: DictionaryEntry[],
  partOfSpeech: string[]
): DictionaryEntry[] {
  if (partOfSpeech.length === 0) return entries;
  
  return entries.filter(entry => 
    partOfSpeech.includes(entry.part_of_speech)
  );
}