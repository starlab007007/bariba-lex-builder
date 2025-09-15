import { loadAndProcessDictionary, ProcessedDictionaryEntry } from '../utils/dictionaryParser';

export interface DictionaryEntry {
  word: string;
  phonetic: string | null;
  part_of_speech: string;
  definition: string;
  example_bariba: string[];
  example_francais: string[];
  notes: string;
  source_flags: string[];
  incertitude: number;
  // Nouveaux champs pour la recherche bidirectionnelle
  french_keywords: string[]; // mots-clés français extraits pour la recherche inverse
  variants: string[]; // variantes du mot bariba
  grammatical_forms?: { // formes grammaticales (foc, pl, plfoc)
    foc?: string;
    pl?: string;
    plfoc?: string;
  };
}

export interface BiDirectionalIndex {
  bariba_to_french: Map<string, DictionaryEntry[]>;
  french_to_bariba: Map<string, DictionaryEntry[]>;
}

// Variable globale pour stocker les entrées chargées
let comprehensiveDictionaryEntries: DictionaryEntry[] = [];
let isLoaded = false;

// Fonction pour charger le dictionnaire complet
export async function loadComprehensiveDictionary(): Promise<DictionaryEntry[]> {
  if (isLoaded && comprehensiveDictionaryEntries.length > 0) {
    return comprehensiveDictionaryEntries;
  }

  try {
    // First try to load from the complete PDF parser (340 pages)
    try {
      const response = await fetch('/parsed-dictionary-content-new.txt');
      if (response.ok) {
        const content = await response.text();
        const { parsePDFDictionaryContent } = await import('../utils/pdfDictionaryExtractor');
        const completeEntries = parsePDFDictionaryContent(content);
        
        if (completeEntries.length > 0) {
          console.log(`Loading ${completeEntries.length} entries from complete PDF parser (340 pages)`);
          
          // Convert to our interface format
          comprehensiveDictionaryEntries = completeEntries.map(entry => ({
            word: entry.word,
            phonetic: entry.phonetic || '',
            part_of_speech: entry.part_of_speech,
            definition: entry.definition,
            example_bariba: entry.example_bariba,
            example_francais: entry.example_francais,
            notes: entry.notes,
            source_flags: entry.source_flags,
            incertitude: entry.incertitude,
            french_keywords: entry.french_keywords,
            variants: entry.variants,
            grammatical_forms: entry.grammatical_forms || {}
          }));
          
          isLoaded = true;
          console.log(`Comprehensive dictionary loaded with ${comprehensiveDictionaryEntries.length} entries from complete PDF (340 pages)`);
          return comprehensiveDictionaryEntries;
        }
      }
    } catch (error) {
      console.warn('Complete PDF parser failed, trying fallback:', error);
    }
    
    // Fallback to processed dictionary
    const processedEntries = await loadAndProcessDictionary();
    comprehensiveDictionaryEntries = processedEntries.map(entry => ({
      word: entry.word,
      phonetic: entry.phonetic || '',
      part_of_speech: entry.part_of_speech,
      definition: entry.definition,
      example_bariba: entry.example_bariba,
      example_francais: entry.example_francais,
      notes: entry.notes,
      source_flags: entry.source_flags,
      incertitude: entry.incertitude,
      french_keywords: entry.french_keywords,
      variants: entry.variants,
      grammatical_forms: {}
    })) as DictionaryEntry[];
    
    isLoaded = true;
    console.log(`Comprehensive dictionary loaded with ${comprehensiveDictionaryEntries.length} entries`);
    return comprehensiveDictionaryEntries;
  } catch (error) {
    console.error('Error loading comprehensive dictionary:', error);
    // Fallback to empty array if loading fails
    return [];
  }
}

// Export synchrone pour compatibilité
export { comprehensiveDictionaryEntries };

// Fonction pour créer l'index bidirectionnel
export function createBiDirectionalIndex(entries: DictionaryEntry[]): BiDirectionalIndex {
  const bariba_to_french = new Map<string, DictionaryEntry[]>();
  const french_to_bariba = new Map<string, DictionaryEntry[]>();

  entries.forEach(entry => {
    // Index Bariba -> Français
    const baribaKey = entry.word.toLowerCase();
    if (!bariba_to_french.has(baribaKey)) {
      bariba_to_french.set(baribaKey, []);
    }
    bariba_to_french.get(baribaKey)!.push(entry);

    // Ajouter les variantes
    entry.variants.forEach(variant => {
      const variantKey = variant.toLowerCase();
      if (!bariba_to_french.has(variantKey)) {
        bariba_to_french.set(variantKey, []);
      }
      bariba_to_french.get(variantKey)!.push(entry);
    });

    // Index Français -> Bariba
    entry.french_keywords.forEach(keyword => {
      const frenchKey = keyword.toLowerCase();
      if (!french_to_bariba.has(frenchKey)) {
        french_to_bariba.set(frenchKey, []);
      }
      french_to_bariba.get(frenchKey)!.push(entry);
    });

    // Ajouter aussi les mots de la définition
    const definitionWords = entry.definition.toLowerCase()
      .split(/[,\s\-\.;:!?]+/)
      .filter(word => word.length > 2);
    
    definitionWords.forEach(word => {
      if (!french_to_bariba.has(word)) {
        french_to_bariba.set(word, []);
      }
      if (!french_to_bariba.get(word)!.includes(entry)) {
        french_to_bariba.get(word)!.push(entry);
      }
    });
  });

  return { bariba_to_french, french_to_bariba };
}

// Variable globale pour l'index
let dictionaryIndex: BiDirectionalIndex | null = null;

// Fonction pour obtenir l'index (lazy loading)
export async function getDictionaryIndex(): Promise<BiDirectionalIndex> {
  if (!dictionaryIndex) {
    const entries = await loadComprehensiveDictionary();
    dictionaryIndex = createBiDirectionalIndex(entries);
  }
  return dictionaryIndex;
}