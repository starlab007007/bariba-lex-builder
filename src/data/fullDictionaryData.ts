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

// Fonction pour créer l'index bidirectionnel optimisé
export function createBiDirectionalIndex(entries: DictionaryEntry[]): BiDirectionalIndex {
  const bariba_to_french = new Map<string, DictionaryEntry[]>();
  const french_to_bariba = new Map<string, DictionaryEntry[]>();

  entries.forEach(entry => {
    // Index Bariba -> Français (mots principaux et variantes)
    const addToBaribaIndex = (word: string) => {
      const key = word.toLowerCase().trim();
      if (!key) return;
      
      if (!bariba_to_french.has(key)) {
        bariba_to_french.set(key, []);
      }
      bariba_to_french.get(key)!.push(entry);
    };

    // Ajouter le mot principal
    addToBaribaIndex(entry.word);

    // Ajouter les variantes
    entry.variants.forEach(variant => addToBaribaIndex(variant));

    // Index Français -> Bariba (mots-clés et définition)
    const addToFrenchIndex = (word: string) => {
      const key = word.toLowerCase().trim();
      if (!key || key.length < 3) return; // Ignorer les mots trop courts
      
      // Ignorer les mots trop communs
      const stopWords = ['les', 'des', 'une', 'pour', 'dans', 'avec', 'sans', 'sur', 'sous', 'par'];
      if (stopWords.includes(key)) return;
      
      if (!french_to_bariba.has(key)) {
        french_to_bariba.set(key, []);
      }
      
      const entries = french_to_bariba.get(key)!;
      if (!entries.includes(entry)) {
        entries.push(entry);
      }
    };

    // Ajouter les mots-clés français
    entry.french_keywords.forEach(keyword => addToFrenchIndex(keyword));

    // Ajouter les mots de la définition
    const definitionWords = entry.definition
      .toLowerCase()
      .split(/[,\s\-\.;:!?()\[\]]+/)
      .filter(word => word.length > 2);
    
    definitionWords.forEach(word => addToFrenchIndex(word));

    // Ajouter les mots des exemples français
    entry.example_francais.forEach(example => {
      const exampleWords = example
        .toLowerCase()
        .split(/[,\s\-\.;:!?()\[\]]+/)
        .filter(word => word.length > 2);
      
      exampleWords.forEach(word => addToFrenchIndex(word));
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