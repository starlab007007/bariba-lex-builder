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
    const processedEntries = await loadAndProcessDictionary();
    comprehensiveDictionaryEntries = processedEntries as DictionaryEntry[];
    isLoaded = true;
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