import { supabase } from "@/integrations/supabase/client";

export interface DictionaryEntry {
  id?: string; // Optional - only present for database entries
  word: string;
  phonetic: string | null;
  part_of_speech: string;
  definition: string;
  example_bariba: string[];
  example_francais: string[];
  notes: string;
  source_flags: string[]; // Source indicators: 'db', 'dict', 'biblical'
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

interface CacheData {
  version: string;
  timestamp: number;
  sources: {
    supabase: { count: number; checksum: string };
    dictionnaire_10_2: { count: number; checksum: string };
    fra_bba: { count: number; checksum: string };
  };
  entries: DictionaryEntry[];
}

export interface BiDirectionalIndex {
  bariba_to_french: Map<string, DictionaryEntry[]>;
  french_to_bariba: Map<string, DictionaryEntry[]>;
}

// Variables globales
let comprehensiveDictionaryEntries: DictionaryEntry[] = [];
let isLoaded = false;
const CACHE_VERSION = "2.0";
const CACHE_KEY = "dictionary_cache_v2";
const CACHE_EXPIRY_DAYS = 7;

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

// Simple checksum function
function simpleChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Load from cache
function loadFromCache(): DictionaryEntry[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cacheData: CacheData = JSON.parse(cached);
    
    // Check version and expiry
    if (cacheData.version !== CACHE_VERSION) return null;
    
    const ageInDays = (Date.now() - cacheData.timestamp) / (1000 * 60 * 60 * 24);
    if (ageInDays > CACHE_EXPIRY_DAYS) return null;

    console.log(`✅ Cache loaded: ${cacheData.entries.length} entries`);
    return cacheData.entries;
  } catch (error) {
    console.error('Cache load error:', error);
    return null;
  }
}

// Save to cache with QuotaExceededError handling
function saveToCache(entries: DictionaryEntry[], sources: CacheData['sources']): void {
  try {
    const cacheData: CacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      sources,
      entries
    };
    
    const serialized = JSON.stringify(cacheData);
    localStorage.setItem(CACHE_KEY, serialized);
    console.log(`💾 Cache saved: ${entries.length} entries (${(serialized.length / 1024).toFixed(2)} KB)`);
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      console.warn('⚠️ LocalStorage quota exceeded - clearing old cache and retrying...');
      try {
        // Clear old cache entries
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem('dictionary_cache'); // Old cache key
        
        // Try to save again with minimal data (without examples to reduce size)
        const minimalEntries = entries.map(e => ({
          ...e,
          example_bariba: [],
          example_francais: []
        }));
        
        const minimalCache: CacheData = {
          version: CACHE_VERSION,
          timestamp: Date.now(),
          sources,
          entries: minimalEntries
        };
        
        localStorage.setItem(CACHE_KEY, JSON.stringify(minimalCache));
        console.log(`💾 Minimal cache saved: ${minimalEntries.length} entries (without examples)`);
      } catch (retryError) {
        console.warn('⚠️ Unable to save cache - continuing without cache');
      }
    } else {
      console.error('Cache save error:', error);
    }
  }
}

// Load from dictionnaire-10-2.json
async function loadDictionnaire10_2(): Promise<DictionaryEntry[]> {
  try {
    console.log('📖 Loading dictionnaire-10-2.json...');
    const dict = await import('./dictionnaire-10-2.json');
    const data = dict.default || dict;
    
    const entries: DictionaryEntry[] = data
      .filter((item: any) => item.word && item.word.trim())
      .map((item: any) => ({
        word: item.word.trim(),
        phonetic: item.phonetic || null,
        part_of_speech: item.part_of_speech || 'n',
        definition: item.definition || '',
        example_bariba: item.example_bariba ? [item.example_bariba] : [],
        example_francais: item.example_francais ? [item.example_francais] : [],
        notes: '',
        source_flags: ['dict'],
        incertitude: 0.3,
        french_keywords: extractFrenchKeywords(item.definition || '', item.example_francais ? [item.example_francais] : []),
        variants: []
      }));
    
    console.log(`✅ Loaded ${entries.length} entries from dictionnaire-10-2.json`);
    return entries;
  } catch (error) {
    console.error('Error loading dictionnaire-10-2.json:', error);
    return [];
  }
}

// SUPPRIMÉ: Ne plus charger fra_bba_dictionnary.json (données bibliques)
async function loadFraBbaDictionary(): Promise<DictionaryEntry[]> {
  console.log('⚠️ Données bibliques désactivées - fra_bba_dictionnary.json non chargé');
  return [];
}

// Load from Supabase
async function loadFromDatabase(): Promise<DictionaryEntry[]> {
  try {
    console.log('🗄️ Loading from database...');
    const { data, error } = await supabase
      .from('dictionary_entries')
      .select('*')
      .order('word', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const entries: DictionaryEntry[] = data.map(entry => ({
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
      source_flags: ['db'],
      incertitude: entry.quality_score ? 1 - (entry.quality_score / 100) : 0.1,
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

    console.log(`✅ Loaded ${entries.length} entries from database`);
    return entries;
  } catch (error) {
    console.error('Error loading from database:', error);
    return [];
  }
}

// Deduplicate and merge entries
function mergeDictionarySources(
  dbEntries: DictionaryEntry[],
  dictEntries: DictionaryEntry[],
  biblicalEntries: DictionaryEntry[]
): DictionaryEntry[] {
  const merged = new Map<string, DictionaryEntry>();
  
  // Priority: database > dictionary > biblical
  const addEntries = (entries: DictionaryEntry[], priority: number) => {
    for (const entry of entries) {
      const key = entry.word.toLowerCase().trim();
      if (!key) continue;
      
      const existing = merged.get(key);
      if (!existing || existing.source_flags.includes('biblical')) {
        // Keep DB/dict entry, but merge examples from biblical
        if (existing && entry.source_flags.includes('biblical')) {
          existing.example_bariba = [...new Set([...existing.example_bariba, ...entry.example_bariba])];
          existing.example_francais = [...new Set([...existing.example_francais, ...entry.example_francais])];
          existing.source_flags = [...new Set([...existing.source_flags, ...entry.source_flags])];
        } else {
          merged.set(key, { ...entry });
        }
      }
    }
  };
  
  addEntries(biblicalEntries, 3);
  addEntries(dictEntries, 2);
  addEntries(dbEntries, 1);
  
  return Array.from(merged.values());
}

// Main loading function
export async function loadComprehensiveDictionary(): Promise<DictionaryEntry[]> {
  if (isLoaded && comprehensiveDictionaryEntries.length > 0) {
    return comprehensiveDictionaryEntries;
  }

  // Try cache first
  const cached = loadFromCache();
  if (cached && cached.length > 0) {
    comprehensiveDictionaryEntries = cached;
    isLoaded = true;
    
    // Load fresh data in background
    loadAllSources().then(entries => {
      if (entries.length > cached.length) {
        comprehensiveDictionaryEntries = entries;
        console.log(`🔄 Updated cache with ${entries.length} entries`);
      }
    });
    
    return cached;
  }

  // Load all sources
  comprehensiveDictionaryEntries = await loadAllSources();
  isLoaded = true;
  
  return comprehensiveDictionaryEntries;
}

// Load all sources and merge
async function loadAllSources(): Promise<DictionaryEntry[]> {
  try {
    console.log('🔄 Loading all dictionary sources...');
    
    // Load all sources in parallel (bibliques supprimées)
    const [dbEntries, dictEntries] = await Promise.all([
      loadFromDatabase(),
      loadDictionnaire10_2()
    ]);
    
    // Merge sources (sans données bibliques)
    const merged = mergeDictionarySources(dbEntries, dictEntries, []);
    
    console.log(`🎉 Total entries: ${merged.length}`);
    console.log(`   - Database: ${dbEntries.length}`);
    console.log(`   - Dictionary: ${dictEntries.length}`);
    console.log(`   - Biblical: SUPPRIMÉES`);
    
    // Save to cache (sans données bibliques)
    const sources = {
      supabase: { 
        count: dbEntries.length, 
        checksum: simpleChecksum(JSON.stringify(dbEntries.slice(0, 10))) 
      },
      dictionnaire_10_2: { 
        count: dictEntries.length, 
        checksum: simpleChecksum(JSON.stringify(dictEntries.slice(0, 10))) 
      },
      fra_bba: { 
        count: 0, 
        checksum: 'DISABLED' 
      }
    };
    
    saveToCache(merged, sources);
    
    return merged;
  } catch (error) {
    console.error('Error loading all sources:', error);
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