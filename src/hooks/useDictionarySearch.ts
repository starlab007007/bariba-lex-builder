import { useState, useMemo, useEffect } from "react";
import { type DictionaryEntry, getDictionaryIndex, loadComprehensiveDictionary } from "@/data/fullDictionaryData";

export type SearchDirection = "bariba-to-french" | "french-to-bariba" | "all";

export interface SearchResult {
  entries: DictionaryEntry[];
  totalResults: number;
  searchDirection: SearchDirection;
  query: string;
}

export const useDictionarySearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDirection, setSearchDirection] = useState<SearchDirection>("all");
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [dictionaryIndex, setDictionaryIndex] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      } catch (error) {
        console.error('Error loading dictionary:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const searchResults = useMemo((): SearchResult => {
    if (isLoading || !dictionaryIndex) {
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
        const foundInBariba = entry.example_bariba.some(example => 
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
        const foundInFrench = entry.example_francais.some(example => 
          example.toLowerCase().includes(query)
        );
        if (foundInFrench) {
          resultSet.add(entry);
        }
      });

      // Recherche dans les notes
      entries.forEach(entry => {
        if (entry.notes.toLowerCase().includes(query)) {
          resultSet.add(entry);
        }
      });
    }

    const resultEntries = Array.from(resultSet);
    
    // Tri par pertinence : mots exacts en premier, puis par ordre alphabétique
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
  }, [searchQuery, searchDirection, entries, dictionaryIndex, isLoading]);

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

  return {
    searchQuery,
    setSearchQuery,
    searchDirection,
    setSearchDirection,
    searchResults,
    getSearchPlaceholder,
    getSearchDirectionLabel,
    isLoading
  };
};