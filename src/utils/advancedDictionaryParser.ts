export interface AdvancedDictionaryEntry {
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
  grammatical_forms: {
    foc?: string;
    pl?: string;
    plfoc?: string;
  };
}

export function cleanText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '') // Remove invisible chars
    .replace(/[››‚]/g, '') // Remove special chars
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/['']/g, "'") // Normalize apostrophes
    .trim();
}

export function extractPhonetic(text: string): string | null {
  const phoneticMatch = text.match(/\[([^\]]+)\]/);
  return phoneticMatch ? phoneticMatch[1].trim() : null;
}

export function extractPartOfSpeech(text: string): { main: string; flags: string[] } {
  const cleaned = cleanText(text);
  const flags: string[] = [];
  
  // Extract part of speech markers
  const posMatch = cleaned.match(/n:([ygtw])|interj|pron|adv|conj|prep|det|loc|lv/);
  let main = posMatch ? posMatch[0] : 'n';
  
  // Extract additional flags
  const flagMatches = cleaned.match(/\b(foc|pl|plfoc|suj|sub|synD)\b/g);
  if (flagMatches) {
    flags.push(...flagMatches);
  }
  
  return { main, flags };
}

export function extractGrammaticalForms(text: string): { foc?: string; pl?: string; plfoc?: string } {
  const forms: { foc?: string; pl?: string; plfoc?: string } = {};
  
  // Extract foc: pattern
  const focMatch = text.match(/foc\.:?\s*([^.]+?)(?:\.|pl:|plfoc:|$)/);
  if (focMatch) {
    forms.foc = cleanText(focMatch[1]);
  }
  
  // Extract pl: pattern
  const plMatch = text.match(/pl\.:?\s*([^.]+?)(?:\.|foc:|plfoc:|$)/);
  if (plMatch) {
    forms.pl = cleanText(plMatch[1]);
  }
  
  // Extract plfoc: pattern
  const plfocMatch = text.match(/plfoc\.:?\s*([^.]+?)(?:\.|foc:|pl:|$)/);
  if (plfocMatch) {
    forms.plfoc = cleanText(plfocMatch[1]);
  }
  
  return forms;
}

export function separateExamples(text: string): { bariba: string[]; francais: string[] } {
  const bariba: string[] = [];
  const francais: string[] = [];
  
  // Split by sentence markers and analyze each part
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 3);
  
  for (const sentence of sentences) {
    // Check if it's French (contains common French words or patterns)
    const isFrench = /\b(le|la|les|un|une|des|du|de|dans|avec|pour|par|sur|sous|est|sont|que|qui|où|quand|comment|pourquoi|je|tu|il|elle|nous|vous|ils|elles|ce|cette|ces|c'est|n'est|pas|très|bien|mais|ou|et|donc|car|si|quand)\b/i.test(sentence);
    
    if (isFrench && sentence.length > 5) {
      francais.push(sentence);
    } else if (sentence.length > 5 && !/^(foc|pl|plfoc)\.:/.test(sentence)) {
      bariba.push(sentence);
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
    .filter(word => word.length > 2 && !/^\d+$/.test(word) && !/^(le|la|les|un|une|des|du|de|dans|avec|pour|par|sur|sous|est|sont|que|qui|où|quand|comment|pourquoi|je|tu|il|elle|nous|vous|ils|elles|ce|cette|ces)$/.test(word));
  
  defWords.forEach(word => keywords.add(word));
  
  // Extract from French examples
  examples.forEach(example => {
    const exampleWords = cleanText(example)
      .toLowerCase()
      .split(/[,\s\-\.;:!?()]+/)
      .filter(word => word.length > 2 && !/^\d+$/.test(word) && !/^(le|la|les|un|une|des|du|de|dans|avec|pour|par|sur|sous|est|sont|que|qui|où|quand|comment|pourquoi|je|tu|il|elle|nous|vous|ils|elles|ce|cette|ces)$/.test(word));
    
    exampleWords.forEach(word => keywords.add(word));
  });
  
  return Array.from(keywords);
}

export function extractVariants(word: string, text: string): string[] {
  const variants: string[] = [];
  
  // Extract variants from the word itself (separated by / or ,)
  const wordParts = word.split(/[\/,]/).map(p => p.trim()).filter(p => p);
  if (wordParts.length > 1) {
    variants.push(...wordParts.slice(1));
  }
  
  // Extract synD (synonym) references
  const synMatch = text.match(/synD:\s*([^.]+)/);
  if (synMatch) {
    const synVariants = synMatch[1].split(/[,;]/).map(v => v.trim()).filter(v => v);
    variants.push(...synVariants);
  }
  
  return [...new Set(variants)]; // Remove duplicates
}

export function parseAdvancedDictionaryContent(content: string): AdvancedDictionaryEntry[] {
  const entries: AdvancedDictionaryEntry[] = [];
  const lines = content.split('\n');
  
  let currentEntry: Partial<AdvancedDictionaryEntry> | null = null;
  let currentText = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and metadata
    if (!trimmedLine || trimmedLine.startsWith('##') || trimmedLine.startsWith('###') || 
        trimmedLine.startsWith('Document parsed') || trimmedLine.includes('Images from page')) {
      continue;
    }
    
    // Check if this is a new entry (starts with #)
    if (trimmedLine.startsWith('# ') && !trimmedLine.includes('dictionnaire')) {
      // Process previous entry if exists
      if (currentEntry && currentEntry.word) {
        const processedEntry = processEntryText(currentEntry.word, currentText);
        if (processedEntry.definition.trim()) {
          entries.push(processedEntry);
        }
      }
      
      // Start new entry
      const word = trimmedLine.replace(/^# /, '').trim();
      currentEntry = { word };
      currentText = '';
    } else if (currentEntry) {
      // Accumulate text for current entry
      currentText += ' ' + trimmedLine;
    }
  }
  
  // Process the last entry
  if (currentEntry && currentEntry.word) {
    const processedEntry = processEntryText(currentEntry.word, currentText);
    if (processedEntry.definition.trim()) {
      entries.push(processedEntry);
    }
  }
  
  return entries.filter(entry => entry.word && entry.definition);
}

function processEntryText(word: string, text: string): AdvancedDictionaryEntry {
  const cleanedText = cleanText(text);
  
  // Extract phonetic
  const phonetic = extractPhonetic(cleanedText);
  
  // Extract part of speech
  const { main: partOfSpeech, flags: sourceFlags } = extractPartOfSpeech(cleanedText);
  
  // Extract grammatical forms
  const grammaticalForms = extractGrammaticalForms(cleanedText);
  
  // Remove phonetic and grammatical info to get the main content
  let mainContent = cleanedText
    .replace(/\[[^\]]+\]/g, '') // Remove phonetic
    .replace(/n:[ygtw]/g, '') // Remove part of speech
    .replace(/interj\.?|pron\.?|adv\.?|conj\.?|prep\.?|det\.?|loc\.?|lv\.?/g, '')
    .replace(/foc\.:?[^.]+(?:\.|$)/g, '') // Remove foc forms
    .replace(/pl\.:?[^.]+(?:\.|$)/g, '') // Remove pl forms
    .replace(/plfoc\.:?[^.]+(?:\.|$)/g, '') // Remove plfoc forms
    .replace(/synD:[^.]+/g, '') // Remove synD
    .trim();
  
  // Split into definition and examples
  const sentences = mainContent.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  
  let definition = '';
  let exampleText = '';
  
  // First sentence is usually the definition
  if (sentences.length > 0) {
    definition = sentences[0].replace(/^\d+\)\s*/, '').trim();
    exampleText = sentences.slice(1).join(' ');
  }
  
  // Extract examples
  const examples = separateExamples(exampleText);
  
  // Extract variants
  const variants = extractVariants(word, cleanedText);
  
  // Extract French keywords
  const frenchKeywords = extractFrenchKeywords(definition, examples.francais);
  
  // Extract notes (scientific names, special info)
  let notes = '';
  const parenthesesMatch = cleanedText.match(/\([^)]+\)/g);
  if (parenthesesMatch) {
    notes = parenthesesMatch.join(' ').replace(/[()]/g, '');
  }
  
  // Add variant info to notes
  if (variants.length > 0) {
    const variantNote = `Variantes: ${variants.join(', ')}`;
    notes = notes ? `${notes}. ${variantNote}` : variantNote;
  }
  
  return {
    word: word,
    phonetic,
    part_of_speech: partOfSpeech,
    definition: definition || 'Définition à compléter',
    example_bariba: examples.bariba,
    example_francais: examples.francais,
    notes: cleanText(notes),
    source_flags: sourceFlags,
    incertitude: definition ? 0.0 : 0.3,
    french_keywords: frenchKeywords,
    variants: variants,
    grammatical_forms: grammaticalForms
  };
}

export async function loadAdvancedDictionary(): Promise<AdvancedDictionaryEntry[]> {
  try {
    // Use the parsed PDF content stored in public folder
    const response = await fetch('/parsed-dictionary-content.txt');
    if (!response.ok) {
      throw new Error('Failed to load parsed dictionary content');
    }
    
    const content = await response.text();
    console.log('Processing advanced dictionary from PDF content...');
    
    const processed = parseAdvancedDictionaryContent(content);
    
    console.log(`Successfully processed ${processed.length} advanced dictionary entries`);
    
    return processed;
  } catch (error) {
    console.error('Error loading advanced dictionary:', error);
    return [];
  }
}