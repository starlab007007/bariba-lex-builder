import { supabase } from "@/integrations/supabase/client";

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
  
  // Nouvelles propriétés grammaticales Baatɔnum
  nominal_class?: string;
  plural_form?: string;
  plural_class?: string;
  verb_root?: string;
  verb_radical?: string;
  accomplished_form?: string;
  negative_form?: string;
  verbal_group?: number;
  verb_type?: string;
  benefactive_form?: string;
  derivational_suffixes?: string[];
  tone_pattern?: string;
  low_tone_optional?: boolean;
  adjective_forms?: Record<string, string> | null;
  cross_reference?: string;
  is_main_entry?: boolean;
  grammatical_notes?: string;
  usage_context?: string;
}

export interface BiDirectionalIndex {
  bariba_to_french: Map<string, DictionaryEntry[]>;
  french_to_bariba: Map<string, DictionaryEntry[]>;
}

// Variable globale pour stocker les entrées chargées
let comprehensiveDictionaryEntries: DictionaryEntry[] = [];
let isLoaded = false;

// Fonction pour extraire les mots-clés français d'une entrée
function extractFrenchKeywords(definition: string, examples: string[]): string[] {
  const keywords = new Set<string>();
  
  // Extract from definition
  const defWords = definition
    .toLowerCase()
    .split(/[,\s\-\.;:!?()]+/)
    .filter(word => word.length > 2 && !/^\d+$/.test(word));
  
  defWords.forEach(word => keywords.add(word));
  
  // Extract from French examples
  examples.forEach(example => {
    const exampleWords = example
      .toLowerCase()
      .split(/[,\s\-\.;:!?()]+/)
      .filter(word => word.length > 2 && !/^\d+$/.test(word));
    
    exampleWords.forEach(word => keywords.add(word));
  });
  
  return Array.from(keywords);
}

// Fonction pour charger le dictionnaire complet depuis Supabase
export async function loadComprehensiveDictionary(): Promise<DictionaryEntry[]> {
  if (isLoaded && comprehensiveDictionaryEntries.length > 0) {
    return comprehensiveDictionaryEntries;
  }

  try {
    console.log('Loading dictionary from database...');
    const { data, error } = await supabase
      .from('dictionary_entries')
      .select('*')
      .order('word', { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('No dictionary entries found in database');
      return [];
    }

    console.log(`Loaded ${data.length} entries from database`);

    // Transformer les données de la base en format DictionaryEntry
    comprehensiveDictionaryEntries = data.map(entry => ({
      word: entry.word,
      phonetic: entry.phonetic,
      part_of_speech: entry.part_of_speech || 'n',
      definition: entry.definition,
      example_bariba: entry.example_bariba || [],
      example_francais: entry.example_francais || [],
      notes: [
        entry.grammatical_notes,
        entry.usage_context,
        entry.cross_reference ? `Voir aussi: ${entry.cross_reference}` : ''
      ].filter(Boolean).join('. '),
      source_flags: [],
      incertitude: entry.quality_score ? 1 - (entry.quality_score / 100) : 0.5,
      french_keywords: entry.french_keywords || extractFrenchKeywords(entry.definition, entry.example_francais || []),
      variants: entry.variants || [],
      nominal_class: entry.nominal_class || undefined,
      plural_form: entry.plural_form || undefined,
      plural_class: entry.plural_class || undefined,
      verb_root: entry.verb_root || undefined,
      verb_radical: entry.verb_radical || undefined,
      accomplished_form: entry.accomplished_form || undefined,
      negative_form: entry.negative_form || undefined,
      verbal_group: entry.verbal_group || undefined,
      verb_type: entry.verb_type || undefined,
      benefactive_form: entry.benefactive_form || undefined,
      derivational_suffixes: entry.derivational_suffixes || undefined,
      tone_pattern: entry.tone_pattern || undefined,
      low_tone_optional: entry.low_tone_optional || undefined,
      adjective_forms: entry.adjective_forms ? (entry.adjective_forms as Record<string, string>) : null,
      cross_reference: entry.cross_reference || undefined,
      is_main_entry: entry.is_main_entry ?? true,
      grammatical_notes: entry.grammatical_notes || undefined,
      usage_context: entry.usage_context || undefined
    }));

    isLoaded = true;
    console.log('Dictionary loaded successfully');
    return comprehensiveDictionaryEntries;
  } catch (error) {
    console.error('Error loading dictionary from database:', error);
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