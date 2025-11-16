import { useState, useMemo, useEffect, useCallback } from "react";
import { type DictionaryEntry, getDictionaryIndex, loadComprehensiveDictionary } from "@/data/fullDictionaryData";
import { calculateRelevance, Trie, LRUCache } from "@/utils/searchAlgorithms";

export type SearchDirection = "bariba-to-french" | "french-to-bariba" | "all";

export interface SearchResult {
  entries: DictionaryEntry[];
  totalResults: number;
  searchDirection: SearchDirection;
  query: string;
  relevanceScores?: Map<string, number>;
}

export interface WordSuggestion {
  word: string;
  type: "bariba" | "french";
  isExact: boolean;
  entry: DictionaryEntry;
}

interface SmartIndex {
  baribaWords: Set<string>;
  frenchWords: Set<string>;
  wordTrie: Map<string, DictionaryEntry[]>;
  baribaTrie: Trie;
  frenchTrie: Trie;
}

// Cache LRU global pour les recherches
const searchCache = new LRUCache<string, SearchResult>(50);

export const useSmartDictionarySearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDirection, setSearchDirection] = useState<SearchDirection>("all");
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [dictionaryIndex, setDictionaryIndex] = useState<any>(null);
  const [smartIndex, setSmartIndex] = useState<SmartIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullResults, setShowFullResults] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);

  // Créer l'index intelligent pour la recherche rapide avec Tries optimisés
  const createSmartIndex = useCallback((entriesData: DictionaryEntry[]): SmartIndex => {
    const baribaWords = new Set<string>();
    const frenchWords = new Set<string>();
    const wordTrie = new Map<string, DictionaryEntry[]>();
    const baribaTrie = new Trie();
    const frenchTrie = new Trie();

    entriesData.forEach(entry => {
      // Indexer le mot bariba principal
      const mainWord = entry.word.toLowerCase();
      baribaWords.add(mainWord);
      baribaTrie.insert(mainWord, entry);
      
      // Créer des préfixes pour la recherche intelligente
      for (let i = 1; i <= mainWord.length; i++) {
        const prefix = mainWord.substring(0, i);
        if (!wordTrie.has(prefix)) {
          wordTrie.set(prefix, []);
        }
        wordTrie.get(prefix)!.push(entry);
      }

      // Indexer les variantes
      entry.variants?.forEach(variant => {
        const variantLower = variant.toLowerCase();
        baribaWords.add(variantLower);
        baribaTrie.insert(variantLower, entry);
        
        for (let i = 1; i <= variantLower.length; i++) {
          const prefix = variantLower.substring(0, i);
          if (!wordTrie.has(prefix)) {
            wordTrie.set(prefix, []);
          }
          if (!wordTrie.get(prefix)!.includes(entry)) {
            wordTrie.get(prefix)!.push(entry);
          }
        }
      });

      // Indexer les mots français de la définition et mots-clés
      const frenchKeywords = entry.french_keywords || [];
      frenchKeywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        frenchWords.add(keywordLower);
        frenchTrie.insert(keywordLower, entry);
        
        for (let i = 1; i <= keywordLower.length; i++) {
          const prefix = keywordLower.substring(0, i);
          if (!wordTrie.has(prefix)) {
            wordTrie.set(prefix, []);
          }
          if (!wordTrie.get(prefix)!.includes(entry)) {
            wordTrie.get(prefix)!.push(entry);
          }
        }
      });

      // Indexer les mots de la définition française
      const definitionWords = entry.definition.toLowerCase()
        .split(/[,\s\-\.;:!?()]+/)
        .filter(word => word.length > 2);
      
      definitionWords.forEach(word => {
        frenchWords.add(word);
        frenchTrie.insert(word, entry);
        
        for (let i = 1; i <= word.length; i++) {
          const prefix = word.substring(0, i);
          if (!wordTrie.has(prefix)) {
            wordTrie.set(prefix, []);
          }
          if (!wordTrie.get(prefix)!.includes(entry)) {
            wordTrie.get(prefix)!.push(entry);
          }
        }
      });
    });

    return { baribaWords, frenchWords, wordTrie, baribaTrie, frenchTrie };
  }, []);

  // Charger le dictionnaire au montage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedEntries, index] = await Promise.all([
          loadComprehensiveDictionary(),
          getDictionaryIndex()
        ]);
        setEntries(loadedEntries);
        setDictionaryIndex(index);
        setSmartIndex(createSmartIndex(loadedEntries));
      } catch (error) {
        console.error('Error loading dictionary:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [createSmartIndex]);

  // Détecter automatiquement la langue du mot tapé
  const detectLanguage = useCallback((query: string): "bariba" | "french" | "unknown" => {
    if (!query) return "unknown";
    
    const baribaChars = /[ɔɛáàãéèẽíìĩóòõúùũɛ̃ɔ̃]/i;
    const frenchChars = /[àâäæçéèêëïîôùûüÿœ]/i;
    
    // Si contient des caractères bariba spécifiques
    if (baribaChars.test(query)) return "bariba";
    
    // Si contient des accents français
    if (frenchChars.test(query)) return "french";
    
    // Vérifier dans l'index
    if (smartIndex) {
      const queryLower = query.toLowerCase();
      if (smartIndex.baribaWords.has(queryLower)) return "bariba";
      if (smartIndex.frenchWords.has(queryLower)) return "french";
    }
    
    return "unknown";
  }, [smartIndex]);

  // Trouver une correspondance exacte
  const findExactMatch = useCallback((query: string): DictionaryEntry | null => {
    if (!smartIndex || !query.trim()) return null;
    
    const queryLower = query.toLowerCase().trim();
    
    // Chercher dans les mots bariba
    for (const entry of entries) {
      if (entry.word.toLowerCase() === queryLower) return entry;
      if (entry.variants?.some(v => v.toLowerCase() === queryLower)) return entry;
    }
    
    // Chercher dans les mots français
    for (const entry of entries) {
      if (entry.french_keywords?.some(k => k.toLowerCase() === queryLower)) return entry;
    }
    
    return null;
  }, [smartIndex, entries]);

  // Suggestions intelligentes (rapide)
  const wordSuggestions = useMemo((): WordSuggestion[] => {
    if (isLoading || !smartIndex || !searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    const suggestions: WordSuggestion[] = [];
    const seenWords = new Set<string>();

    // Recherche dans le trie pour des suggestions rapides
    const trieEntries = smartIndex.wordTrie.get(query) || [];
    
    trieEntries.forEach(entry => {
      // Suggestion pour le mot bariba principal
      if (!seenWords.has(entry.word)) {
        const matchesDirection = 
          searchDirection === "all" || 
          (searchDirection === "bariba-to-french" && entry.word.toLowerCase().startsWith(query)) ||
          (searchDirection === "french-to-bariba" && entry.definition.toLowerCase().includes(query));

        if (matchesDirection) {
          suggestions.push({
            word: entry.word,
            type: "bariba",
            isExact: entry.word.toLowerCase() === query,
            entry
          });
          seenWords.add(entry.word);
        }
      }

      // Suggestions pour les mots français
      if (entry.french_keywords) {
        entry.french_keywords.forEach(keyword => {
          if (keyword.toLowerCase().startsWith(query) && !seenWords.has(keyword)) {
            const matchesDirection = 
              searchDirection === "all" || 
              searchDirection === "french-to-bariba";

            if (matchesDirection) {
              suggestions.push({
                word: keyword,
                type: "french",
                isExact: keyword.toLowerCase() === query,
                entry
              });
              seenWords.add(keyword);
            }
          }
        });
      }
    });

    // Trier par pertinence : traductions exactes en premier, puis mots exacts, puis alphabétique
    return suggestions
      .sort((a, b) => {
        // 1. Priorité absolue aux correspondances exactes de traduction directe
        const aIsDirectTranslation = (searchDirection === "french-to-bariba" && a.type === "french" && a.isExact) ||
                                    (searchDirection === "bariba-to-french" && a.type === "bariba" && a.isExact);
        const bIsDirectTranslation = (searchDirection === "french-to-bariba" && b.type === "french" && b.isExact) ||
                                    (searchDirection === "bariba-to-french" && b.type === "bariba" && b.isExact);
        
        if (aIsDirectTranslation && !bIsDirectTranslation) return -1;
        if (!aIsDirectTranslation && bIsDirectTranslation) return 1;
        
        // 2. Puis les correspondances exactes générales
        if (a.isExact && !b.isExact) return -1;
        if (!a.isExact && b.isExact) return 1;
        
        // 3. Alphabétique en dernier recours
        return a.word.localeCompare(b.word);
      })
      .slice(0, 8); // Limiter à 8 suggestions
  }, [searchQuery, searchDirection, smartIndex, isLoading]);

  // Résultats complets avec scoring de pertinence (seulement quand demandé)
  const fullSearchResults = useMemo((): SearchResult => {
    if (isLoading || !dictionaryIndex || !showFullResults || !entries.length) {
      return {
        entries: [],
        totalResults: 0,
        searchDirection,
        query: ""
      };
    }

    if (!searchQuery.trim()) {
      return {
        entries: entries,
        totalResults: entries.length,
        searchDirection,
        query: ""
      };
    }

    const query = searchQuery.toLowerCase().trim();

    // Vérifier le cache d'abord
    const cacheKey = `${searchDirection}-${query}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const resultSet = new Set<DictionaryEntry>();
    const relevanceScores = new Map<string, number>();

    // Recherche selon la direction spécifiée avec scoring
    if (searchDirection === "bariba-to-french" || searchDirection === "all") {
      // Recherche dans les mots bariba
      for (const [baribaWord, entryList] of dictionaryIndex.bariba_to_french) {
        if (baribaWord.includes(query)) {
          entryList.forEach(entry => {
            resultSet.add(entry);
            const score = calculateRelevance(query, baribaWord);
            const currentScore = relevanceScores.get(entry.word) || 0;
            relevanceScores.set(entry.word, Math.max(currentScore, score.totalScore));
          });
        }
      }

      // Recherche dans les exemples bariba et phonétique
      entries.forEach(entry => {
        const foundInBariba = entry.example_bariba?.some(example => 
          example.toLowerCase().includes(query)
        );
        if (foundInBariba) {
          resultSet.add(entry);
          const currentScore = relevanceScores.get(entry.word) || 0;
          relevanceScores.set(entry.word, Math.max(currentScore, 40));
        }

        if (entry.phonetic && entry.phonetic.toLowerCase().includes(query)) {
          resultSet.add(entry);
          const currentScore = relevanceScores.get(entry.word) || 0;
          relevanceScores.set(entry.word, Math.max(currentScore, 50));
        }
      });
    }

    if (searchDirection === "french-to-bariba" || searchDirection === "all") {
      // Recherche dans les mots français avec scoring
      for (const [frenchWord, entryList] of dictionaryIndex.french_to_bariba) {
        if (frenchWord.includes(query)) {
          entryList.forEach(entry => {
            resultSet.add(entry);
            const score = calculateRelevance(query, frenchWord);
            const currentScore = relevanceScores.get(entry.word) || 0;
            relevanceScores.set(entry.word, Math.max(currentScore, score.totalScore));
          });
        }
      }

      // Recherche dans définitions, exemples et notes
      entries.forEach(entry => {
        if (entry.definition.toLowerCase().includes(query)) {
          resultSet.add(entry);
          const score = calculateRelevance(query, entry.definition.toLowerCase());
          const currentScore = relevanceScores.get(entry.word) || 0;
          relevanceScores.set(entry.word, Math.max(currentScore, score.totalScore + 10));
        }

        const foundInFrench = entry.example_francais?.some(example => 
          example.toLowerCase().includes(query)
        );
        if (foundInFrench) {
          resultSet.add(entry);
          const currentScore = relevanceScores.get(entry.word) || 0;
          relevanceScores.set(entry.word, Math.max(currentScore, 40));
        }

        if (entry.notes && entry.notes.toLowerCase().includes(query)) {
          resultSet.add(entry);
          const currentScore = relevanceScores.get(entry.word) || 0;
          relevanceScores.set(entry.word, Math.max(currentScore, 30));
        }
      });
    }

    const resultEntries = Array.from(resultSet);
    
    // Tri par score de pertinence
    resultEntries.sort((a, b) => {
      const scoreA = relevanceScores.get(a.word) || 0;
      const scoreB = relevanceScores.get(b.word) || 0;
      
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // En cas d'égalité, tri alphabétique
      return a.word.localeCompare(b.word);
    });

    const result: SearchResult = {
      entries: resultEntries,
      totalResults: resultEntries.length,
      searchDirection,
      query: searchQuery,
      relevanceScores
    };

    // Mettre en cache
    searchCache.set(cacheKey, result);
    
    return result;
  }, [searchQuery, searchDirection, entries, dictionaryIndex, isLoading, showFullResults]);

  const performFullSearch = useCallback(() => {
    setShowFullResults(true);
  }, []);

  const clearFullSearch = useCallback(() => {
    setShowFullResults(false);
    setSelectedEntry(null);
  }, []);

  // Sélectionner une entrée spécifique
  const selectEntry = useCallback((entry: DictionaryEntry) => {
    setSelectedEntry(entry);
    setShowFullResults(true);
  }, []);

  // Détecter automatiquement les correspondances exactes et déclencher la recherche
  useEffect(() => {
    if (searchQuery.trim().length >= 3 && !isLoading) {
      const exactMatch = findExactMatch(searchQuery);
      if (exactMatch) {
        setSelectedEntry(exactMatch);
        setShowFullResults(true);
      } else {
        setSelectedEntry(null);
      }
    } else {
      setSelectedEntry(null);
      setShowFullResults(false);
    }
  }, [searchQuery, findExactMatch, isLoading]);

  const getSearchPlaceholder = () => {
    switch (searchDirection) {
      case "bariba-to-french":
        return "Tapez un mot en bariba (ex: aagu, agbegi...)";
      case "french-to-bariba":
        return "Tapez un mot en français (ex: salut, menuisier...)";
      default:
        return "Rechercher en bariba ou français...";
    }
  };

  const getSearchDirectionLabel = () => {
    switch (searchDirection) {
      case "bariba-to-french":
        return "Bariba → Français";
      case "french-to-bariba":
        return "Français → Bariba";
      default:
        return "Bidirectionnel";
    }
  };

  // Réinitialiser quand la direction change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setShowFullResults(false);
      setSelectedEntry(null);
    }
  }, [searchDirection, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    searchDirection,
    setSearchDirection,
    wordSuggestions,
    fullSearchResults,
    showFullResults,
    performFullSearch,
    clearFullSearch,
    selectEntry,
    selectedEntry,
    detectLanguage,
    getSearchPlaceholder,
    getSearchDirectionLabel,
    isLoading,
    totalWords: entries.length
  };
};