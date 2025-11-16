// Utilitaires linguistiques pour le Baatɔnum
// Gère l'alphabet, les tons, les classes nominales, et les conjugaisons

// Ordre alphabétique Baatɔnum (digraphes inclus)
export const BAATONUM_ALPHABET = [
  'a', 'b', 'gb', 'd', 'e', 'ɛ', 'f', 'g', 'h', 'i',
  'k', 'l', 'm', 'n', 'o', 'ɔ', 'p', 'kp', 'r', 's',
  't', 'u', 'w', 'y'
];

// Voyelles nasales
const NASAL_VOWELS = ['ã', 'ɛ̃', 'ĩ', 'ɔ̃', 'ũ'];
const NASAL_VOWEL_PAIRS: Record<string, string> = {
  'ã': 'a', 'ɛ̃': 'ɛ', 'ĩ': 'i', 'ɔ̃': 'ɔ', 'ũ': 'u'
};

// Suffixes dérivatifs verbaux
export type DerivationalSuffix = '-ma' | '-na' | '-ra' | '-ri' | '-si' | '-sia';

export const DERIVATIONAL_MEANINGS: Record<DerivationalSuffix, string> = {
  '-ma': 'action ramenée vers le locuteur, ou action débutante',
  '-na': 'action mutuelle, l\'un l\'autre',
  '-ra': 'passif, action subie',
  '-ri': 'action faite contre, à l\'insu de, au détriment de',
  '-si': 'vers, en direction, dans, sur, à l\'aide de',
  '-sia': 'actif, faire faire'
};

export interface NominalClassAttributes {
  classCode: string;
  singularSubject: string;
  pluralSubject: string;
  singularDeterminer: string;
  pluralDeterminer: string;
}

export interface VerbForms {
  root: string;
  radical: string;
  accomplished?: string;
  negative?: string;
  benefactive?: string;
  group?: number;
}

// Comparer deux caractères selon l'ordre alphabétique Baatɔnum
function compareChars(a: string, b: string): number {
  const indexA = BAATONUM_ALPHABET.indexOf(a.toLowerCase());
  const indexB = BAATONUM_ALPHABET.indexOf(b.toLowerCase());
  
  if (indexA === -1 && indexB === -1) return a.localeCompare(b);
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  
  return indexA - indexB;
}

// Décomposer un mot en unités alphabétiques (gérer les digraphes)
function decomposeWord(word: string): string[] {
  const units: string[] = [];
  let i = 0;
  
  while (i < word.length) {
    // Vérifier les digraphes (gb, kp)
    if (i < word.length - 1) {
      const digraph = word.substring(i, i + 2).toLowerCase();
      if (digraph === 'gb' || digraph === 'kp') {
        units.push(digraph);
        i += 2;
        continue;
      }
    }
    
    // Caractère simple
    units.push(word[i].toLowerCase());
    i++;
  }
  
  return units;
}

// Normaliser les voyelles nasales pour la comparaison
function normalizeNasalForComparison(char: string): { base: string; isNasal: boolean } {
  if (NASAL_VOWELS.includes(char)) {
    return { base: NASAL_VOWEL_PAIRS[char], isNasal: true };
  }
  return { base: char, isNasal: false };
}

/**
 * Trier des mots selon l'ordre alphabétique Baatɔnum
 * Les voyelles nasales viennent après leurs équivalents non nasaux
 */
export function sortBaatonum(words: string[]): string[] {
  return [...words].sort((a, b) => {
    const unitsA = decomposeWord(a);
    const unitsB = decomposeWord(b);
    
    const maxLen = Math.max(unitsA.length, unitsB.length);
    
    for (let i = 0; i < maxLen; i++) {
      if (i >= unitsA.length) return -1;
      if (i >= unitsB.length) return 1;
      
      const normA = normalizeNasalForComparison(unitsA[i]);
      const normB = normalizeNasalForComparison(unitsB[i]);
      
      // Comparer les bases
      const baseCompare = compareChars(normA.base, normB.base);
      if (baseCompare !== 0) return baseCompare;
      
      // Si les bases sont égales, la version non nasale précède
      if (normA.isNasal && !normB.isNasal) return 1;
      if (!normA.isNasal && normB.isNasal) return -1;
    }
    
    return 0;
  });
}

/**
 * Normaliser les voyelles nasales (enlever la nasalisation pour recherche)
 */
export function normalizeNasalVowels(text: string): string {
  let result = text;
  for (const [nasal, base] of Object.entries(NASAL_VOWEL_PAIRS)) {
    result = result.replace(new RegExp(nasal, 'g'), base);
  }
  return result;
}

/**
 * Extraire les positions des tons bas dans un mot
 */
export function extractLowTones(text: string): number[] {
  const positions: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '̀' || /[àèìòùɛ̀ɔ̀]/.test(text[i])) {
      positions.push(i);
    }
  }
  return positions;
}

/**
 * Vérifier si un mot contient des tons bas
 */
export function hasLowTone(text: string): boolean {
  return /[àèìòùɛ̀ɔ̀]|̀/.test(text);
}

/**
 * Normaliser les tons (enlever tous les marqueurs de tons)
 */
export function normalizeTones(text: string): string {
  return text
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ɛ̀ɛ́ɛ̂ɛ̃]/g, 'ɛ')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ɔ̀ɔ́ɔ̂ɔ̃]/g, 'ɔ')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[\u0300-\u036f]/g, ''); // Enlever les diacritiques combinants
}

/**
 * Extraire la classe nominale d'une catégorie grammaticale
 * Exemple: "n.t" -> "t", "n:w" -> "w"
 */
export function extractNominalClass(partOfSpeech: string): string | null {
  const match = partOfSpeech.match(/n[.:]([bgmnstwy])/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Générer la forme plurielle d'un nom selon sa classe
 */
export function getPluralForm(singular: string, nominalClass: string): string {
  // Règles simplifiées de formation du pluriel
  // Dans la réalité, cela dépend de la classe et de la phonologie
  const pluralSuffixes: Record<string, { from: string; to: string }> = {
    't': { from: 'ru', to: 'nu' },
    'b': { from: 'bu', to: 'bi' },
    'w': { from: 'ru', to: 'ri' },
    'y': { from: 'a', to: 'i' }
  };
  
  const suffix = pluralSuffixes[nominalClass];
  if (suffix && singular.endsWith(suffix.from)) {
    return singular.slice(0, -suffix.from.length) + suffix.to;
  }
  
  return singular; // Retourner tel quel si pas de règle
}

/**
 * Appliquer un suffixe dérivationnel à un radical verbal
 */
export function applyDerivationalSuffix(radical: string, suffix: DerivationalSuffix): string {
  // Enlever le tiret du suffixe
  const suffixText = suffix.replace('-', '');
  return radical + suffixText;
}

/**
 * Obtenir la signification d'un suffixe dérivationnel
 */
export function getDerivationalMeaning(suffix: string): string {
  return DERIVATIONAL_MEANINGS[suffix as DerivationalSuffix] || '';
}

/**
 * Générer la forme bénéfactive d'un verbe
 * Ajoute -a aux verbes à plusieurs syllabes et -ya/-wa aux monosyllabiques
 */
export function generateBenefactiveForm(root: string): string {
  // Compter les syllabes (approximation simple)
  const vowelCount = (root.match(/[aeiouɛɔ]/gi) || []).length;
  
  if (vowelCount <= 1) {
    // Monosyllabique: ajouter -ya ou -wa
    if (root.endsWith('w')) {
      return root + 'a';
    }
    return root + 'ya';
  } else {
    // Plusieurs syllabes: ajouter -a
    return root + 'a';
  }
}

/**
 * Décliner un adjectif selon la classe nominale
 */
export function declineAdjective(radical: string, nominalClass: string): string {
  // Règles simplifiées de déclinaison
  const endings: Record<string, string> = {
    'b': 'bu',
    'g': 'gu',
    'm': 'mu',
    'n': 'nu',
    's': 'su',
    't': 'ru',
    'w': 'wu',
    'y': 'a'
  };
  
  const ending = endings[nominalClass];
  return ending ? radical + ending : radical;
}

/**
 * Conjuguer un verbe selon la personne, le temps et le groupe
 * Version simplifiée - devrait être étendue avec les données de la table verbal_conjugations
 */
export function conjugateVerb(
  root: string,
  person: '1sg' | '2sg' | '3sg' | '1pl' | '2pl' | '3pl',
  tense: 'future' | 'accomplished' | 'inaccomplished',
  group: number = 1
): string {
  const particles: Record<string, Record<string, string>> = {
    'future': {
      '1sg': 'u koo',
      '2sg': 'ga koo',
      '3sg': 'u koo',
      '1pl': 'ta koo',
      '2pl': 'ya koo',
      '3pl': 'ba koo'
    },
    'accomplished': {
      '1sg': 'u',
      '2sg': 'ga',
      '3sg': 'u',
      '1pl': 'ta',
      '2pl': 'ya',
      '3pl': 'ba'
    },
    'inaccomplished': {
      '1sg': 'u',
      '2sg': 'ga',
      '3sg': 'u',
      '1pl': 'ta',
      '2pl': 'ya',
      '3pl': 'ba'
    }
  };
  
  const particle = particles[tense]?.[person] || 'u';
  
  if (tense === 'future') {
    return `${particle} ${root}`;
  } else if (tense === 'inaccomplished') {
    return `${particle} ${root}mɔ`;
  } else {
    // accomplished
    return `${particle} ${root}a`;
  }
}

/**
 * Extraire les formes verbales d'une entrée de dictionnaire formatée
 * Exemple: "duure, r. duuru-, na duura/-re"
 */
export function extractVerbForms(entry: string): VerbForms | null {
  // Pattern pour extraire les formes verbales
  const pattern = /^(\w+),?\s*r\.\s*(\w+)-?,?\s*(?:na\s*)?(\w+)?\/?(-?\w+)?/i;
  const match = entry.match(pattern);
  
  if (!match) return null;
  
  return {
    root: match[1],
    radical: match[2],
    accomplished: match[3] || undefined,
    negative: match[4]?.replace('-', '') || undefined
  };
}