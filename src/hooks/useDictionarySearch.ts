import { useState, useMemo } from "react";
import { type DictionaryEntry, dictionaryIndex, comprehensiveDictionaryEntries } from "@/data/fullDictionaryData";

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

  const searchResults = useMemo((): SearchResult => {
    if (!searchQuery.trim()) {
      return {
        entries: comprehensiveDictionaryEntries,
        totalResults: comprehensiveDictionaryEntries.length,
        searchDirection,
        query: ""
      };
    }

    const query = searchQuery.toLowerCase().trim();
    const resultSet = new Set<DictionaryEntry>();

    // Recherche selon la direction spécifiée
    if (searchDirection === "bariba-to-french" || searchDirection === "all") {
      // Recherche dans les mots bariba
      for (const [baribaWord, entries] of dictionaryIndex.bariba_to_french) {
        if (baribaWord.includes(query)) {
          entries.forEach(entry => resultSet.add(entry));
        }
      }

      // Recherche dans les exemples bariba
      comprehensiveDictionaryEntries.forEach(entry => {
        const foundInBariba = entry.example_bariba.some(example => 
          example.toLowerCase().includes(query)
        );
        if (foundInBariba) {
          resultSet.add(entry);
        }
      });

      // Recherche phonétique
      comprehensiveDictionaryEntries.forEach(entry => {
        if (entry.phonetic && entry.phonetic.toLowerCase().includes(query)) {
          resultSet.add(entry);
        }
      });
    }

    if (searchDirection === "french-to-bariba" || searchDirection === "all") {
      // Recherche dans les mots français
      for (const [frenchWord, entries] of dictionaryIndex.french_to_bariba) {
        if (frenchWord.includes(query)) {
          entries.forEach(entry => resultSet.add(entry));
        }
      }

      // Recherche dans les définitions françaises
      comprehensiveDictionaryEntries.forEach(entry => {
        if (entry.definition.toLowerCase().includes(query)) {
          resultSet.add(entry);
        }
      });

      // Recherche dans les exemples français
      comprehensiveDictionaryEntries.forEach(entry => {
        const foundInFrench = entry.example_francais.some(example => 
          example.toLowerCase().includes(query)
        );
        if (foundInFrench) {
          resultSet.add(entry);
        }
      });

      // Recherche dans les notes
      comprehensiveDictionaryEntries.forEach(entry => {
        if (entry.notes.toLowerCase().includes(query)) {
          resultSet.add(entry);
        }
      });
    }

    const entries = Array.from(resultSet);
    
    // Tri par pertinence : mots exacts en premier, puis par ordre alphabétique
    entries.sort((a, b) => {
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
      entries,
      totalResults: entries.length,
      searchDirection,
      query
    };
  }, [searchQuery, searchDirection]);

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
    getSearchDirectionLabel
  };
};