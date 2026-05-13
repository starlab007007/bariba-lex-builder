// Source unique de vérité pour l'alphabet Bariba — utilisé par le clavier
// flottant React et (via JSON équivalent) par l'IME natif Android.

export const COMBINING_GRAVE = '\u0300'; // ◌̀ ton bas
export const COMBINING_ACUTE = '\u0301'; // ◌́ ton haut
export const COMBINING_TILDE = '\u0303'; // ◌̃ nasalisation

// Voyelles Bariba spécifiques (déjà sur la rangée existante)
export const SPECIALS: Array<{ lo: string; up: string }> = [
  { lo: 'ɔ', up: 'Ɔ' }, // U+0254 / U+0186
  { lo: 'ɛ', up: 'Ɛ' }, // U+025B / U+0190
  { lo: 'ŋ', up: 'Ŋ' }, // U+014B / U+014A
];

// Voyelles nasalisées précomposées
export const NASALS: Array<{ lo: string; up: string }> = [
  { lo: 'ã', up: 'Ã' }, // U+00E3
  { lo: 'ĩ', up: 'Ĩ' }, // U+0129
  { lo: 'ũ', up: 'Ũ' }, // U+0169
  { lo: 'õ', up: 'Õ' }, // U+00F5
  { lo: 'ẽ', up: 'Ẽ' }, // U+1EBD
  { lo: 'ɛ̃', up: 'Ɛ̃' }, // ɛ + U+0303
  { lo: 'ɔ̃', up: 'Ɔ̃' }, // ɔ + U+0303
];

// Variantes accessibles via long-press sur les voyelles
export const VOWEL_VARIANTS: Record<string, string[]> = {
  a: ['à', 'á', 'â', 'ä', 'ã', 'ã̀', 'ã́'],
  e: ['è', 'é', 'ê', 'ë', 'ẽ', 'ɛ', 'ɛ̀', 'ɛ́', 'ɛ̃', 'ɛ̃̀'],
  i: ['ì', 'í', 'î', 'ï', 'ĩ', 'ĩ̀', 'ĩ́'],
  o: ['ò', 'ó', 'ô', 'ö', 'õ', 'ɔ', 'ɔ̀', 'ɔ́', 'ɔ̃', 'ɔ̃̀'],
  u: ['ù', 'ú', 'û', 'ü', 'ũ', 'ũ̀', 'ṹ'],
  ɔ: ['ɔ̀', 'ɔ́', 'ɔ̃', 'ɔ̃̀', 'ɔ̃́'],
  ɛ: ['ɛ̀', 'ɛ́', 'ɛ̃', 'ɛ̃̀', 'ɛ̃́'],
  n: ['ŋ', 'ǹ', 'ñ'],
};

// Helper : détecte si un texte contient des caractères Bariba spécifiques
export function isLikelyBariba(text: string): boolean {
  return /[ɔɛŋãĩũõẽ]/i.test(text);
}

// Helper : NFC obligatoire pour copier/coller universel
export function nfc(text: string): string {
  return text.normalize('NFC');
}