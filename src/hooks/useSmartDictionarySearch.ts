import { useState, useMemo, useEffect, useCallback } from "react";
import { type DictionaryEntry, getDictionaryIndex, loadComprehensiveDictionary } from "@/data/fullDictionaryData";

export type SearchDirection = "bariba-to-french" | "french-to-bariba" | "all";

export interface SearchResult {
  entries: DictionaryEntry[];
  totalResults: number;
  searchDirection: SearchDirection;
  query: string;
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
}

export const useSmartDictionarySearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDirection, setSearchDirection] = useState<SearchDirection>("all");
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [dictionaryIndex, setDictionaryIndex] = useState<any>(null);
  const [smartIndex, setSmartIndex] = useState<SmartIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullResults, setShowFullResults] = useState(false);

  // Créer l'index intelligent pour la recherche rapide
  const createSmartIndex = useCallback((entriesData: DictionaryEntry[]): SmartIndex => {
    const baribaWords = new Set<string>();
    const frenchWords = new Set<string>();
    const wordTrie = new Map<string, DictionaryEntry[]>();

    entriesData.forEach(entry => {
      // Indexer le mot bariba principal
      const mainWord = entry.word.toLowerCase();
      baribaWords.add(mainWord);
      
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

      // Indexer les mots français de la définition
      const frenchKeywords = entry.french_keywords || [];
      frenchKeywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        frenchWords.add(keywordLower);
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

    return { baribaWords, frenchWords, wordTrie };
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

    // Trier par pertinence : mots exacts en premier, puis alphabétique
    return suggestions
      .sort((a, b) => {
        if (a.isExact && !b.isExact) return -1;
        if (!a.isExact && b.isExact) return 1;
        return a.word.localeCompare(b.word);
      })
      .slice(0, 8); // Limiter à 8 suggestions
  }, [searchQuery, searchDirection, smartIndex, isLoading]);

  // Résultats complets (seulement quand demandé)
  const fullSearchResults = useMemo((): SearchResult => {
    if (isLoading || !dictionaryIndex || !showFullResults) {
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
    const resultSet = new Set<DictionaryEntry>();

    // Recherche selon la direction spécifiée
    if (searchDirection === "bariba-to-french" || searchDirection === "all") {
      // Recherche dans les mots bariba
      for (const [baribaWord, entryList] of dictionaryIndex.bariba_to_french) {
        if (baribaWord.includes(query)) {
          entryList.forEach(entry => resultSet.add(entry));
        }
      }

      // Recherche dans les exemples bariba
      entries.forEach(entry => {
        const foundInBariba = entry.example_bariba?.some(example => 
          example.toLowerCase().includes(query)
        );
        if (foundInBariba) {
          resultSet.add(entry);
        }
      });

      // Recherche phonétique
      entries.forEach(entry => {
        if (entry.phonetic && entry.phonetic.toLowerCase().includes(query)) {
          resultSet.add(entry);
        }
      });
    }

    if (searchDirection === "french-to-bariba" || searchDirection === "all") {
      // Recherche dans les mots français
      for (const [frenchWord, entryList] of dictionaryIndex.french_to_bariba) {
        if (frenchWord.includes(query)) {
          entryList.forEach(entry => resultSet.add(entry));
        }
      }

      // Recherche dans les définitions françaises
      entries.forEach(entry => {
        if (entry.definition.toLowerCase().includes(query)) {
          resultSet.add(entry);
        }
      });

      // Recherche dans les exemples français
      entries.forEach(entry => {
        const foundInFrench = entry.example_francais?.some(example => 
          example.toLowerCase().includes(query)
        );
        if (foundInFrench) {
          resultSet.add(entry);
        }
      });

      // Recherche dans les notes
      entries.forEach(entry => {
        if (entry.notes && entry.notes.toLowerCase().includes(query)) {
          resultSet.add(entry);
        }
      });
    }

    const resultEntries = Array.from(resultSet);
    
    // Tri par pertinence
    resultEntries.sort((a, b) => {
      const aWordMatch = a.word.toLowerCase() === query;
      const bWordMatch = b.word.toLowerCase() === query;
      
      if (aWordMatch && !bWordMatch) return -1;
      if (!aWordMatch && bWordMatch) return 1;
      
      const aStartsWith = a.word.toLowerCase().startsWith(query);
      const bStartsWith = b.word.toLowerCase().startsWith(query);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return a.word.localeCompare(b.word);
    });

    return {
      entries: resultEntries,
      totalResults: resultEntries.length,
      searchDirection,
      query
    };
  }, [searchQuery, searchDirection, entries, dictionaryIndex, isLoading, showFullResults]);

  const performFullSearch = useCallback(() => {
    setShowFullResults(true);
  }, []);

  const clearFullSearch = useCallback(() => {
    setShowFullResults(false);
  }, []);

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

  // Reset full search when query or direction changes
  useEffect(() => {
    setShowFullResults(false);
  }, [searchQuery, searchDirection]);

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
    getSearchPlaceholder,
    getSearchDirectionLabel,
    isLoading,
    totalWords: entries.length
  };
};