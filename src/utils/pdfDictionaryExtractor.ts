export interface CompleteDictionaryEntry {
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

export function cleanTextAdvanced(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '') // Remove invisible chars
    .replace(/[››‚""'']/g, '') // Remove special chars and quotes
    .replace(/[-–—]/g, '-') // Normalize dashes
    .trim();
}

export function extractWordFromLine(line: string): string | null {
  // Extract word from lines starting with #
  const match = line.match(/^#\s*([^[#]+?)(?:\s*\[|$)/);
  if (match) {
    const word = cleanTextAdvanced(match[1]);
    // Remove common prefixes and suffixes from extracted words
    return word.replace(/^\s*(dictionnaire|bariba|français)\s*/i, '').trim();
  }
  return null;
}

export function extractPhoneticFromText(text: string): string | null {
  const phoneticMatch = text.match(/\[([^\]]+)\]/);
  return phoneticMatch ? cleanTextAdvanced(phoneticMatch[1]) : null;
}

export function extractPartOfSpeechFromText(text: string): { main: string; flags: string[] } {
  const flags: string[] = [];
  
  // Look for part of speech patterns
  const posPatterns = [
    'n:y', 'n:g', 'n:w', 'n:t', 'n:m', 'n:n',
    'interj', 'pron', 'adv', 'conj', 'prep', 'det', 'loc', 'lv'
  ];
  
  let mainPos = 'n'; // default
  
  for (const pattern of posPatterns) {
    if (text.includes(pattern)) {
      mainPos = pattern;
      break;
    }
  }
  
  // Extract additional flags
  const flagPatterns = ['foc', 'pl', 'plfoc', 'suj', 'sub', 'synD', 'Id'];
  for (const flag of flagPatterns) {
    if (text.includes(flag + ':') || text.includes(flag + '.')) {
      flags.push(flag);
    }
  }
  
  return { main: mainPos, flags };
}

export function extractGrammaticalFormsFromText(text: string): { foc?: string; pl?: string; plfoc?: string } {
  const forms: { foc?: string; pl?: string; plfoc?: string } = {};
  
  // Extract foc: pattern - more flexible matching
  const focMatch = text.match(/foc\.:?\s*([^.]+?)(?:\.|pl:|plfoc:|synD:|Id:|$)/i);
  if (focMatch) {
    forms.foc = cleanTextAdvanced(focMatch[1]);
  }
  
  // Extract pl: pattern
  const plMatch = text.match(/pl\.:?\s*([^.]+?)(?:\.|foc:|plfoc:|synD:|Id:|$)/i);
  if (plMatch) {
    forms.pl = cleanTextAdvanced(plMatch[1]);
  }
  
  // Extract plfoc: pattern
  const plfocMatch = text.match(/plfoc\.:?\s*([^.]+?)(?:\.|foc:|pl:|synD:|Id:|$)/i);
  if (plfocMatch) {
    forms.plfoc = cleanTextAdvanced(plfocMatch[1]);
  }
  
  return forms;
}

export function extractDefinitionAndExamples(text: string): {
  definition: string;
  examples: { bariba: string[]; francais: string[] };
} {
  // Remove phonetic, part of speech, and grammatical forms - improved pattern
  let cleanedText = text
    .replace(/\[[^\]]+\]/g, '') // Remove phonetic
    .replace(/\b(n:[ygtwnm]|interj\.?|pron\.?\s*suj\.?|adv\.?|conj\.?|prep\.?|det\.?|loc\.?|lv\.?)\b/gi, '')
    .replace(/\b(foc\.:?[^.]*\.?|pl\.:?[^.]*\.?|plfoc\.:?[^.]*\.?)\b/gi, '') // Remove grammatical forms
    .replace(/\b(synD:[^.]*\.?|Id:[^.]*\.?)\b/gi, '') // Remove references
    .replace(/\d+\)\s*/g, '') // Remove numbered definitions like "1)", "2)"
    .trim();
  
  // Split into sentences
  const sentences = cleanedText
    .split(/(?<=[.!?])\s+/)
    .map(s => cleanTextAdvanced(s))
    .filter(s => s.length > 3);
  
  let definition = '';
  const baribaExamples: string[] = [];
  const francaisExamples: string[] = [];
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    // Skip numbered definitions and clean sentence
    const cleanSentence = sentence.replace(/^\d+\)\s*/, '').replace(/^\s*[.,:;]\s*/, '');
    
    // Skip very short sentences and grammatical markers
    if (cleanSentence.length <= 3 || cleanSentence.match(/^(foc|pl|plfoc|synD|Id)\./)) {
      continue;
    }
    
    // First meaningful sentence is usually the definition
    if (!definition && cleanSentence.length > 5 && !cleanSentence.match(/^\d/)) {
      definition = cleanSentence;
      continue;
    }
    
    // Improved language detection for French
    const isFrench = /\b(le|la|les|un|une|des|du|de|dans|avec|pour|par|sur|sous|est|sont|que|qui|où|quand|comment|pourquoi|je|tu|il|elle|nous|vous|ils|elles|ce|cette|ces|c'est|n'est|pas|très|bien|mais|ou|et|donc|car|si|quand|son|sa|ses|mon|ma|mes|ton|ta|tes|notre|nos|votre|vos|leur|leurs|avant|après|pendant|vers|chez|sans|contre|entre|parmi|selon|sauf|malgré|grâce)\b/i.test(sentence) ||
                    /[àâäéèêëïîôöùûüÿñç]/i.test(sentence);
    
    if (isFrench && cleanSentence.length > 5) {
      francaisExamples.push(cleanSentence);
    } else if (cleanSentence.length > 5) {
      baribaExamples.push(cleanSentence);
    }
  }
  
  return {
    definition: definition || 'Définition à compléter',
    examples: { bariba: baribaExamples, francais: francaisExamples }
  };
}

export function extractVariantsFromText(word: string, text: string): string[] {
  const variants: string[] = [];
  
  // Extract variants from the word itself (separated by / or ,)
  const wordParts = word.split(/[\/,]/).map(p => p.trim()).filter(p => p);
  if (wordParts.length > 1) {
    variants.push(...wordParts.slice(1));
  }
  
  // Extract synD (synonym) references
  const synMatch = text.match(/synD:\s*([^.]+)/i);
  if (synMatch) {
    const synVariants = synMatch[1].split(/[,;]/).map(v => cleanTextAdvanced(v)).filter(v => v);
    variants.push(...synVariants);
  }
  
  // Extract Id references (identifications)
  const idMatches = text.match(/Id:\s*([^.;]+)/gi);
  if (idMatches) {
    idMatches.forEach(match => {
      const idContent = match.replace(/^Id:\s*/i, '');
      const idVariants = idContent.split(/[,;]/).map(v => cleanTextAdvanced(v)).filter(v => v);
      variants.push(...idVariants);
    });
  }
  
  return [...new Set(variants)]; // Remove duplicates
}

export function extractFrenchKeywordsAdvanced(definition: string, examples: string[]): string[] {
  const keywords = new Set<string>();
  
  // Common French stop words to exclude
  const stopWords = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'dans', 'avec', 'pour', 'par', 'sur', 'sous',
    'est', 'sont', 'que', 'qui', 'où', 'quand', 'comment', 'pourquoi', 'je', 'tu', 'il', 'elle',
    'nous', 'vous', 'ils', 'elles', 'ce', 'cette', 'ces', 'c\'est', 'n\'est', 'pas', 'très', 'bien',
    'mais', 'ou', 'et', 'donc', 'car', 'si', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'ton', 'ta',
    'tes', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'au', 'aux', 'à', 'en'
  ]);
  
  // Extract from definition
  const defWords = cleanTextAdvanced(definition)
    .toLowerCase()
    .split(/[,\s\-\.;:!?()]+/)
    .filter(word => word.length > 2 && !/^\d+$/.test(word) && !stopWords.has(word));
  
  defWords.forEach(word => keywords.add(word));
  
  // Extract from French examples
  examples.forEach(example => {
    const exampleWords = cleanTextAdvanced(example)
      .toLowerCase()
      .split(/[,\s\-\.;:!?()]+/)
      .filter(word => word.length > 2 && !/^\d+$/.test(word) && !stopWords.has(word));
    
    exampleWords.forEach(word => keywords.add(word));
  });
  
  return Array.from(keywords);
}

export function parsePDFDictionaryContent(content: string): CompleteDictionaryEntry[] {
  const entries: CompleteDictionaryEntry[] = [];
  const lines = content.split('\n');
  
  let currentWord: string | null = null;
  let currentText = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, metadata, and navigation elements
    if (!line || line.startsWith('##') || line.startsWith('###') || 
        line.startsWith('Document parsed') || line.includes('Images from page') ||
        line.includes('dictionnaire bariba') || line.includes('français') ||
        line.includes('parsed-documents://') || line.includes('full page screenshot') ||
        line.match(/^Page \d+/) || line.match(/^-\s*`.*`/)) {
      continue;
    }
    
    // Check if this is a new word entry (starts with #)
    const wordMatch = extractWordFromLine(line);
    if (wordMatch && !line.includes('dictionnaire') && wordMatch.length > 0) {
      // Process previous entry if exists
      if (currentWord && currentText.trim()) {
        const entry = processEntryContent(currentWord, currentText);
        if (entry.definition.trim() && entry.definition !== 'Définition à compléter' && entry.word.length > 0) {
          entries.push(entry);
        }
      }
      
      // Start new entry
      currentWord = wordMatch;
      currentText = line.replace(/^#\s*/, ''); // Remove the # marker
    } else if (currentWord && line.trim()) {
      // Continue accumulating text for current entry (only if line is not empty)
      currentText += ' ' + line;
    }
  }
  
  // Process the last entry
  if (currentWord && currentText.trim()) {
    const entry = processEntryContent(currentWord, currentText);
    if (entry.definition.trim() && entry.definition !== 'Définition à compléter' && entry.word.length > 0) {
      entries.push(entry);
    }
  }
  
  console.log(`Processed ${entries.length} complete dictionary entries from PDF content`);
  return entries.filter(entry => entry.word && entry.definition && entry.word.length > 0);
}

function processEntryContent(word: string, text: string): CompleteDictionaryEntry {
  const cleanedText = cleanTextAdvanced(text);
  
  // Extract phonetic
  const phonetic = extractPhoneticFromText(cleanedText);
  
  // Extract part of speech
  const { main: partOfSpeech, flags: sourceFlags } = extractPartOfSpeechFromText(cleanedText);
  
  // Extract grammatical forms
  const grammaticalForms = extractGrammaticalFormsFromText(cleanedText);
  
  // Extract definition and examples
  const { definition, examples } = extractDefinitionAndExamples(cleanedText);
  
  // Extract variants
  const variants = extractVariantsFromText(word, cleanedText);
  
  // Extract French keywords
  const frenchKeywords = extractFrenchKeywordsAdvanced(definition, examples.francais);
  
  // Extract notes (scientific names, special info)
  let notes = '';
  const parenthesesMatches = cleanedText.match(/\([^)]+\)/g);
  if (parenthesesMatches) {
    notes = parenthesesMatches.join(' ').replace(/[()]/g, '');
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
    definition: definition,
    example_bariba: examples.bariba,
    example_francais: examples.francais,
    notes: cleanTextAdvanced(notes),
    source_flags: sourceFlags,
    incertitude: definition && definition !== 'Définition à compléter' ? 0.0 : 0.3,
    french_keywords: frenchKeywords,
    variants: variants,
    grammatical_forms: grammaticalForms
  };
}

export async function generateCompleteDictionaryJSON(): Promise<CompleteDictionaryEntry[]> {
  try {
    // Load the parsed PDF content
    const response = await fetch('/parsed-dictionary-content-new.txt');
    if (!response.ok) {
      throw new Error('Failed to load parsed dictionary content');
    }
    
    const content = await response.text();
    console.log('Processing complete dictionary from PDF content...');
    
    const processed = parsePDFDictionaryContent(content);
    
    console.log(`Successfully processed ${processed.length} complete dictionary entries`);
    
    return processed;
  } catch (error) {
    console.error('Error generating complete dictionary JSON:', error);
    return [];
  }
}