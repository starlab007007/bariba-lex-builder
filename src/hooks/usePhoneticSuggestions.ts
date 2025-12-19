import { useState, useEffect, useMemo, useCallback } from 'react';

export interface PhoneticEntry {
  id?: string; // UUID from database if available
  word: string;
  phonetic: string;
  normalizedPhonetic: string;
  definition: string;
  part_of_speech: string;
  example_bariba?: string;
  example_francais?: string;
}

interface PhoneticIndex {
  entries: PhoneticEntry[];
  prefixMap: Map<string, PhoneticEntry[]>;
}

// Règles de normalisation phonétique bariba
const PHONETIC_NORMALIZATION: Record<string, string> = {
  'à': 'a', 'á': 'a', 'ã': 'a', 'ǎ': 'a', 'ā': 'a',
  'è': 'e', 'é': 'e', 'ẽ': 'e', 'ě': 'e', 'ē': 'e', 'ɛ': 'e', 'ɛ̀': 'e', 'ɛ́': 'e', 'ɛ̃': 'e',
  'ì': 'i', 'í': 'i', 'ĩ': 'i', 'ǐ': 'i', 'ī': 'i',
  'ò': 'o', 'ó': 'o', 'õ': 'o', 'ǒ': 'o', 'ō': 'o', 'ɔ': 'o', 'ɔ̀': 'o', 'ɔ́': 'o', 'ɔ̃': 'o',
  'ù': 'u', 'ú': 'u', 'ũ': 'u', 'ǔ': 'u', 'ū': 'u',
  'ǹ': 'n', 'ń': 'n', 'ŋ': 'ng',
  '›': '', '‹': '', '[': '', ']': '', '/': ''
};

// Normalise une chaîne pour la correspondance phonétique
function normalizePhonetic(text: string): string {
  if (!text) return '';
  
  let normalized = text.toLowerCase();
  
  // Appliquer les règles de normalisation
  for (const [char, replacement] of Object.entries(PHONETIC_NORMALIZATION)) {
    normalized = normalized.split(char).join(replacement);
  }
  
  // Supprimer les caractères non alphanumériques
  normalized = normalized.replace(/[^a-z0-9]/g, '');
  
  return normalized;
}

// Calcul de distance de Levenshtein optimisé
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
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
  
  return matrix[b.length][a.length];
}

// Score de pertinence pour le tri
function calculateRelevanceScore(query: string, entry: PhoneticEntry): number {
  const normalizedQuery = normalizePhonetic(query);
  const normalizedWord = entry.normalizedPhonetic;
  
  // Correspondance exacte = score max
  if (normalizedWord === normalizedQuery) return 100;
  
  // Préfixe exact = très haut score
  if (normalizedWord.startsWith(normalizedQuery)) {
    return 90 - (normalizedWord.length - normalizedQuery.length);
  }
  
  // Contient la requête
  if (normalizedWord.includes(normalizedQuery)) {
    return 70 - normalizedWord.indexOf(normalizedQuery);
  }
  
  // Distance de Levenshtein pour les correspondances approximatives
  const distance = levenshteinDistance(normalizedQuery, normalizedWord.substring(0, Math.min(normalizedQuery.length + 2, normalizedWord.length)));
  
  if (distance <= 2) {
    return 50 - distance * 10;
  }
  
  return 0;
}

export function usePhoneticSuggestions() {
  const [dictionaryData, setDictionaryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger le dictionnaire amélioré
  useEffect(() => {
    const loadDictionary = async () => {
      try {
        console.log('[usePhoneticSuggestions] Loading improved dictionary...');
        const response = await fetch('/dictionnaire_ameliore.json');
        
        if (!response.ok) {
          throw new Error(`Failed to load dictionary: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[usePhoneticSuggestions] Loaded ${data.length} entries`);
        setDictionaryData(data);
        setIsLoading(false);
      } catch (err: any) {
        console.error('[usePhoneticSuggestions] Error loading dictionary:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    loadDictionary();
  }, []);

  // Créer l'index phonétique
  const phoneticIndex = useMemo<PhoneticIndex>(() => {
    if (dictionaryData.length === 0) {
      return { entries: [], prefixMap: new Map() };
    }
    
    console.log('[usePhoneticSuggestions] Building phonetic index...');
    const startTime = performance.now();
    
    const entries: PhoneticEntry[] = dictionaryData
      .filter(item => item.word && item.word.trim())
      .map(item => ({
        word: item.word.trim(),
        phonetic: item.phonetic || item.word,
        normalizedPhonetic: normalizePhonetic(item.phonetic || item.word),
        definition: item.definition || '',
        part_of_speech: item.part_of_speech || 'n',
        example_bariba: item.example_bariba,
        example_francais: item.example_francais
      }));
    
    // Créer une map de préfixes pour accélérer la recherche
    const prefixMap = new Map<string, PhoneticEntry[]>();
    
    entries.forEach(entry => {
      // Indexer par préfixes de 1 à 4 caractères
      for (let len = 1; len <= Math.min(4, entry.normalizedPhonetic.length); len++) {
        const prefix = entry.normalizedPhonetic.substring(0, len);
        if (!prefixMap.has(prefix)) {
          prefixMap.set(prefix, []);
        }
        prefixMap.get(prefix)!.push(entry);
      }
    });
    
    const endTime = performance.now();
    console.log(`[usePhoneticSuggestions] Index built in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`[usePhoneticSuggestions] ${entries.length} entries indexed, ${prefixMap.size} prefix keys`);
    
    return { entries, prefixMap };
  }, [dictionaryData]);

  // Fonction de recherche avec suggestions
  const getSuggestions = useCallback((query: string, maxResults: number = 10): PhoneticEntry[] => {
    if (!query || query.length < 1 || phoneticIndex.entries.length === 0) {
      return [];
    }
    
    const normalizedQuery = normalizePhonetic(query);
    
    if (!normalizedQuery) return [];
    
    // Utiliser la map de préfixes pour filtrer rapidement
    const prefixKey = normalizedQuery.substring(0, Math.min(2, normalizedQuery.length));
    let candidates = phoneticIndex.prefixMap.get(prefixKey) || [];
    
    // Si pas de résultats avec le préfixe de 2 caractères, essayer avec 1
    if (candidates.length === 0 && normalizedQuery.length >= 1) {
      candidates = phoneticIndex.prefixMap.get(normalizedQuery[0]) || [];
    }
    
    // Si toujours pas de résultats, chercher dans tout l'index
    if (candidates.length === 0) {
      candidates = phoneticIndex.entries.filter(entry => 
        entry.normalizedPhonetic.includes(normalizedQuery) ||
        levenshteinDistance(normalizedQuery, entry.normalizedPhonetic.substring(0, normalizedQuery.length + 1)) <= 1
      );
    }
    
    // Calculer les scores et trier
    const scored = candidates
      .map(entry => ({
        entry,
        score: calculateRelevanceScore(query, entry)
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        // Trier par score, puis par longueur de mot
        if (b.score !== a.score) return b.score - a.score;
        return a.entry.word.length - b.entry.word.length;
      })
      .slice(0, maxResults);
    
    return scored.map(({ entry }) => entry);
  }, [phoneticIndex]);

  // Recherche exacte d'un mot
  const findExactMatch = useCallback((word: string): PhoneticEntry | null => {
    const normalized = normalizePhonetic(word);
    return phoneticIndex.entries.find(entry => entry.normalizedPhonetic === normalized) || null;
  }, [phoneticIndex]);

  // Recherche dans les définitions (français -> bariba)
  const searchInDefinitions = useCallback((query: string, maxResults: number = 10): PhoneticEntry[] => {
    if (!query || query.length < 1) return [];
    
    try {
      const normalizedQuery = query.toLowerCase().trim();
      
      if (!normalizedQuery || !phoneticIndex || !phoneticIndex.entries) {
        return [];
      }
      
      const results: PhoneticEntry[] = [];
      
      for (const entry of phoneticIndex.entries) {
        if (results.length >= maxResults) break;
        
        try {
          const definition = (entry.definition || '').toLowerCase();
          const exampleFr = (entry.example_francais || '').toLowerCase();
          const word = (entry.word || '').toLowerCase();
          
          // Chercher dans la définition, les exemples français, ou si le mot français correspond
          if (definition.includes(normalizedQuery) || 
              exampleFr.includes(normalizedQuery) ||
              word.includes(normalizedQuery)) {
            results.push(entry);
          }
        } catch (innerError) {
          console.warn('[usePhoneticSuggestions] Error processing entry:', entry?.word, innerError);
          continue;
        }
      }
      
      // Trier par pertinence : définitions exactes en premier
      results.sort((a, b) => {
        const aDef = (a.definition || '').toLowerCase();
        const bDef = (b.definition || '').toLowerCase();
        const aExact = aDef.startsWith(normalizedQuery);
        const bExact = bDef.startsWith(normalizedQuery);
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return aDef.length - bDef.length;
      });
      
      return results;
    } catch (error) {
      console.error('[usePhoneticSuggestions] searchInDefinitions error:', error);
      return [];
    }
  }, [phoneticIndex]);

  return {
    getSuggestions,
    findExactMatch,
    searchInDefinitions,
    isLoading,
    error,
    totalEntries: phoneticIndex.entries.length
  };
}
