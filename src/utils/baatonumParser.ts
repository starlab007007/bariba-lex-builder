// Parser pour les entrées du dictionnaire Baatɔnum
// Extrait automatiquement les informations grammaticales

import { extractNominalClass, extractVerbForms, type VerbForms } from './baatonumLinguistics';

export interface ParsedEntry {
  word: string;
  mainForm: string;
  variants: string[];
  partOfSpeech: string;
  definition: string;
  
  // Informations nominales
  nominalClass?: string;
  pluralForm?: string;
  pluralClass?: string;
  
  // Informations verbales
  verbRoot?: string;
  verbRadical?: string;
  accomplishedForm?: string;
  negativeForm?: string;
  verbalGroup?: number;
  verbType?: string;
  
  // Autres
  tonePattern?: string;
  crossReference?: string;
  isMainEntry: boolean;
  examples?: string[];
  grammaticalNotes?: string;
}

export interface NounInfo {
  singular: string;
  plural?: string;
  singularClass?: string;
  pluralClass?: string;
  partOfSpeech: string;
}

export interface VerbInfo extends VerbForms {
  type: string;
  group?: number;
}

export interface AdjectiveInfo {
  radical: string;
  forms: Record<string, string>;
  isInvariable: boolean;
}

/**
 * Parser une entrée nominale
 * Exemple: "yaburu, pl. yabunu n.t. marché"
 */
export function parseNounEntry(entry: string): NounInfo | null {
  // Pattern: mot, pl. pluriel n.classe définition
  const pattern = /^(\w+),?\s*pl\.\s*(\w+)\s+n[.:]([bgmnstwy])\s+(.+)/i;
  const match = entry.match(pattern);
  
  if (!match) {
    // Essayer sans forme plurielle explicite
    const simplePattern = /^(\w+)\s+n[.:]([bgmnstwy])\s+(.+)/i;
    const simpleMatch = entry.match(simplePattern);
    
    if (simpleMatch) {
      return {
        singular: simpleMatch[1],
        singularClass: simpleMatch[2].toLowerCase(),
        partOfSpeech: `n.${simpleMatch[2].toLowerCase()}`
      };
    }
    return null;
  }
  
  const singularClass = match[3].toLowerCase();
  
  // Déterminer la classe du pluriel (peut être différente)
  let pluralClass = singularClass;
  if (singularClass === 't' && match[2].endsWith('nu')) {
    pluralClass = 'n';
  } else if (match[2].endsWith('i')) {
    pluralClass = singularClass; // Généralement même classe
  }
  
  return {
    singular: match[1],
    plural: match[2],
    singularClass,
    pluralClass,
    partOfSpeech: `n.${singularClass}`
  };
}

/**
 * Parser une entrée verbale
 * Exemple: "duure, r. duuru-, na duura/-re"
 * Exemple: "gere, r. geru-, na gera/-re v.tr.1"
 */
export function parseVerbEntry(entry: string): VerbInfo | null {
  const verbForms = extractVerbForms(entry);
  if (!verbForms) return null;
  
  // Extraire le type et groupe verbal
  const typePattern = /v\.(tr|int|eq|inv|h\.p|stat|descr)\.?(\d)?/i;
  const typeMatch = entry.match(typePattern);
  
  let verbType = 'v';
  let group: number | undefined;
  
  if (typeMatch) {
    verbType = `v.${typeMatch[1].toLowerCase()}`;
    if (typeMatch[2]) {
      group = parseInt(typeMatch[2]);
    }
  }
  
  // Vérifier si c'est un verbe dérivé
  if (entry.includes('vd.')) {
    verbType = entry.match(/vd\.(tr|int)\.?(\d)?/i)?.[0] || 'vd';
  }
  
  return {
    ...verbForms,
    type: verbType,
    group
  };
}

/**
 * Parser une entrée d'adjectif
 * Exemple: "kpik- adj. blanc"
 * Les formes par classe doivent être déduites ou fournies séparément
 */
export function parseAdjectiveEntry(entry: string): AdjectiveInfo | null {
  const pattern = /^(\w+)-?\s+adj\.\s+(.+)/i;
  const match = entry.match(pattern);
  
  if (!match) return null;
  
  const radical = match[1].replace('-', '');
  
  // Vérifier si l'adjectif est invariable
  const isInvariable = entry.includes('adj. inv') || entry.includes('kpuro');
  
  // Pour les adjectifs variables, générer les formes de base
  const forms: Record<string, string> = {};
  if (!isInvariable) {
    const classes = ['b', 'g', 'm', 'n', 's', 't', 'w', 'y'];
    const endings: Record<string, string> = {
      'b': 'bu', 'g': 'gu', 'm': 'mu', 'n': 'nu',
      's': 'su', 't': 'ru', 'w': 'wu', 'y': 'a'
    };
    
    classes.forEach(cls => {
      forms[cls] = radical + (endings[cls] || '');
    });
  }
  
  return {
    radical,
    forms,
    isInvariable
  };
}

/**
 * Parser une entrée complète du dictionnaire
 */
export function parseFullDictionaryEntry(rawEntry: string): ParsedEntry | null {
  // Séparer le mot de la définition
  const parts = rawEntry.split(/\s+/, 2);
  if (parts.length < 2) return null;
  
  const word = parts[0].replace(/[,;]$/, '');
  
  // Vérifier si c'est une référence croisée
  if (rawEntry.includes('cf.')) {
    const refMatch = rawEntry.match(/cf\.\s*(\w+)/i);
    return {
      word,
      mainForm: word,
      variants: [],
      partOfSpeech: 'reference',
      definition: '',
      crossReference: refMatch?.[1],
      isMainEntry: false
    };
  }
  
  // Détecter les variantes (séparées par /)
  const variants: string[] = [];
  if (word.includes('/')) {
    const variantParts = word.split('/');
    variants.push(...variantParts.slice(1));
  }
  
  // Parser selon le type
  const nounInfo = parseNounEntry(rawEntry);
  if (nounInfo) {
    return {
      word: nounInfo.singular,
      mainForm: nounInfo.singular,
      variants,
      partOfSpeech: nounInfo.partOfSpeech,
      definition: '',
      nominalClass: nounInfo.singularClass,
      pluralForm: nounInfo.plural,
      pluralClass: nounInfo.pluralClass,
      isMainEntry: true
    };
  }
  
  const verbInfo = parseVerbEntry(rawEntry);
  if (verbInfo) {
    return {
      word: verbInfo.root,
      mainForm: verbInfo.root,
      variants,
      partOfSpeech: verbInfo.type,
      definition: '',
      verbRoot: verbInfo.root,
      verbRadical: verbInfo.radical,
      accomplishedForm: verbInfo.accomplished,
      negativeForm: verbInfo.negative,
      verbalGroup: verbInfo.group,
      verbType: verbInfo.type,
      isMainEntry: true
    };
  }
  
  const adjInfo = parseAdjectiveEntry(rawEntry);
  if (adjInfo) {
    return {
      word: adjInfo.radical,
      mainForm: adjInfo.radical,
      variants,
      partOfSpeech: adjInfo.isInvariable ? 'adj.inv' : 'adj',
      definition: '',
      isMainEntry: true
    };
  }
  
  // Entrée générique
  return {
    word,
    mainForm: word,
    variants,
    partOfSpeech: 'unknown',
    definition: '',
    isMainEntry: true
  };
}

/**
 * Extraire des exemples d'une entrée de dictionnaire
 */
export function extractExamples(entry: string): string[] {
  // Les exemples sont souvent entre guillemets ou après "ex:"
  const examples: string[] = [];
  
  // Pattern pour les guillemets
  const quotedPattern = /"([^"]+)"/g;
  let match;
  while ((match = quotedPattern.exec(entry)) !== null) {
    examples.push(match[1]);
  }
  
  // Pattern pour "ex:" ou "exemple:"
  const examplePattern = /(?:ex|exemple):\s*([^.]+\.?)/gi;
  while ((match = examplePattern.exec(entry)) !== null) {
    examples.push(match[1].trim());
  }
  
  return examples;
}

/**
 * Détecter le pattern de tons d'un mot
 */
export function detectTonePattern(word: string): string {
  const tones: string[] = [];
  
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    
    if (/[àèìòùɛ̀ɔ̀]/.test(char)) {
      tones.push('L'); // Ton bas (low)
    } else if (/[áéíóúɛ́ɔ́]/.test(char)) {
      tones.push('H'); // Ton haut (high)
    } else if (/[āēīōūɛ̄ɔ̄]/.test(char)) {
      tones.push('M'); // Ton moyen (mid)
    } else if (/[âêîôûɛ̂ɔ̂]/.test(char)) {
      tones.push('F'); // Ton descendant (falling)
    } else if (/[aeiouɛɔ]/.test(char)) {
      tones.push('H'); // Pas de marqueur = ton haut par défaut
    }
  }
  
  return tones.join('');
}