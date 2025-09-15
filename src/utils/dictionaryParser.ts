export interface RawDictionaryEntry {
  word: string;
  phonetic: string;
  part_of_speech: string;
  definition: string;
  example_bariba: string | string[];
  example_francais: string | string[];
}

export interface ProcessedDictionaryEntry {
  word: string;
  phonetic: string | null;
  part_of_speech: string;
  definition: string;
  example_bariba: string[];
  example_francais: string[];
  notes: string;
  source_flags: string[];
  incertitude: number;
  french_keywords: string[];
  variants: string[];
}

export function cleanText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '') // Remove invisible chars
    .replace(/[››‚]/g, '') // Remove special chars
    .trim();
}

export function extractVariants(word: string): { main: string; variants: string[] } {
  const cleaned = cleanText(word);
  const variants: string[] = [];
  
  // Extract variants separated by / or ,
  const parts = cleaned.split(/[\/,]/).map(p => p.trim()).filter(p => p);
  const main = parts[0] || cleaned;
  
  if (parts.length > 1) {
    variants.push(...parts.slice(1));
  }
  
  return { main, variants };
}

export function extractPartOfSpeech(pos: string): { main: string; flags: string[] } {
  const cleaned = cleanText(pos);
  const flags: string[] = [];
  
  // Extract common grammatical markers
  const markers = cleaned.split(/[-\s]+/).filter(p => p.trim());
  
  let main = 'n'; // default
  
  for (const marker of markers) {
    const m = marker.toLowerCase().trim();
    if (['n', 'v', 'adj', 'adv', 'interj', 'pron', 'det', 'prep', 'conj', 'loc'].includes(m)) {
      main = m;
    } else if (m) {
      flags.push(m);
    }
  }
  
  return { main, flags };
}

export function extractExamples(text: string | string[]): { bariba: string[]; francais: string[] } {
  if (!text) return { bariba: [], francais: [] };
  
  const textStr = Array.isArray(text) ? text.join(' ') : text;
  const cleaned = cleanText(textStr);
  
  if (!cleaned) return { bariba: [], francais: [] };
  
  const bariba: string[] = [];
  const francais: string[] = [];
  
  // Split by common separators and extract examples
  const parts = cleaned.split(/[;.!?]+/).map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    // Simple heuristic: if contains French words, it's French
    const hasFrenchWords = /\b(le|la|les|un|une|des|du|de|dans|avec|pour|par|sur|sous|est|sont|que|qui|où|quand|comment|pourquoi|je|tu|il|elle|nous|vous|ils|elles)\b/i.test(part);
    
    if (hasFrenchWords && part.length > 3) {
      francais.push(part);
    } else if (part.length > 3) {
      bariba.push(part);
    }
  }
  
  return { bariba, francais };
}

export function extractFrenchKeywords(definition: string, examples: string[]): string[] {
  const keywords = new Set<string>();
  
  // Extract from definition
  const defWords = cleanText(definition)
    .toLowerCase()
    .split(/[,\s\-\.;:!?()]+/)
    .filter(word => word.length > 2 && !/^\d+$/.test(word));
  
  defWords.forEach(word => keywords.add(word));
  
  // Extract from French examples
  examples.forEach(example => {
    const exampleWords = cleanText(example)
      .toLowerCase()
      .split(/[,\s\-\.;:!?()]+/)
      .filter(word => word.length > 2 && !/^\d+$/.test(word));
    
    exampleWords.forEach(word => keywords.add(word));
  });
  
  return Array.from(keywords);
}

export function processDictionaryEntry(raw: RawDictionaryEntry): ProcessedDictionaryEntry {
  const { main: word, variants } = extractVariants(raw.word);
  const { main: partOfSpeech, flags: sourceFlags } = extractPartOfSpeech(raw.part_of_speech);
  
  // Clean and extract definition
  let definition = cleanText(raw.definition);
  
  // Remove common prefixes and clean up
  definition = definition
    .replace(/^\d+\)\s*/, '') // Remove "1) "
    .replace(/^:\s*/, '') // Remove ": "
    .replace(/^\s*[a-z]:\s*/, '') // Remove "n: "
    .trim();
  
  // Extract examples from both fields
  const baribaExamples = extractExamples(raw.example_bariba);
  const francaisExamples = extractExamples(raw.example_francais);
  
  // Combine examples
  const allBaribaExamples = [...baribaExamples.bariba, ...francaisExamples.bariba];
  const allFrancaisExamples = [...baribaExamples.francais, ...francaisExamples.francais];
  
  // Generate French keywords
  const frenchKeywords = extractFrenchKeywords(definition, allFrancaisExamples);
  
  // Extract notes (scientific names, variants, etc.)
  let notes = '';
  if (definition.includes('(') && definition.includes(')')) {
    const matches = definition.match(/\([^)]+\)/g);
    if (matches) {
      notes = matches.join(' ').replace(/[()]/g, '');
      definition = definition.replace(/\([^)]+\)/g, '').trim();
    }
  }
  
  // Add variant info to notes
  if (variants.length > 0) {
    const variantNote = `Variantes: ${variants.join(', ')}`;
    notes = notes ? `${notes}. ${variantNote}` : variantNote;
  }
  
  return {
    word: word,
    phonetic: raw.phonetic ? cleanText(raw.phonetic) : null,
    part_of_speech: partOfSpeech,
    definition: definition,
    example_bariba: allBaribaExamples,
    example_francais: allFrancaisExamples,
    notes: notes,
    source_flags: sourceFlags,
    incertitude: definition ? 0.0 : 0.2,
    french_keywords: frenchKeywords,
    variants: variants
  };
}

export async function loadAndProcessDictionary(): Promise<ProcessedDictionaryEntry[]> {
  try {
    // First try to load from the advanced PDF parser
    const { loadAdvancedDictionary } = await import('./advancedDictionaryParser');
    const advancedEntries = await loadAdvancedDictionary();
    
    if (advancedEntries.length > 0) {
      console.log(`Loaded ${advancedEntries.length} entries from advanced PDF parser`);
      // Convert to our format
      return advancedEntries.map(entry => ({
        word: entry.word,
        phonetic: entry.phonetic,
        part_of_speech: entry.part_of_speech,
        definition: entry.definition,
        example_bariba: entry.example_bariba,
        example_francais: entry.example_francais,
        notes: entry.notes,
        source_flags: entry.source_flags,
        incertitude: entry.incertitude,
        french_keywords: entry.french_keywords,
        variants: entry.variants
      }));
    }
    
    // Fallback to JSON data
    const response = await fetch('/src/data/raw-dictionary.json');
    const rawData: RawDictionaryEntry[] = await response.json();
    
    console.log(`Processing ${rawData.length} dictionary entries from JSON...`);
    
    const processed = rawData
      .filter(entry => entry && entry.word) // Remove invalid entries
      .map(processDictionaryEntry)
      .filter(entry => entry.word && entry.word.trim().length > 0); // Remove empty entries
    
    console.log(`Successfully processed ${processed.length} entries`);
    
    return processed;
  } catch (error) {
    console.error('Error loading dictionary:', error);
    return [];
  }
}