/**
 * Moteur linguistique pour appliquer les règles grammaticales contextuelles du Baatɔnum
 * Gère l'accord nominal, la conjugaison verbale, et les déclinaisons
 */

import { DERIVATIONAL_MEANINGS, type VerbForms, type NominalClassAttributes } from "@/utils/baatonumLinguistics";

interface DictionaryEntry {
  word: string;
  part_of_speech?: string;
  nominal_class?: string;
  verbal_group?: number;
  verb_root?: string;
  verb_radical?: string;
  plural_form?: string;
  adjective_forms?: any;
}

export class LinguisticEngine {
  /**
   * Appliquer les règles grammaticales contextuelles
   */
  applyContextualRules(
    baseWord: string,
    context: string[],
    position: number,
    language: 'french' | 'bariba',
    entry?: DictionaryEntry
  ): string {
    if (!entry) return baseWord;

    // Pour le Bariba, appliquer les règles morphologiques
    if (language === 'bariba') {
      return this.applyBaribaRules(baseWord, context, position, entry);
    }

    return baseWord;
  }

  /**
   * Appliquer les règles spécifiques au Bariba
   */
  private applyBaribaRules(
    word: string,
    context: string[],
    position: number,
    entry: DictionaryEntry
  ): string {
    const wordType = this.identifyWordType(entry);

    switch (wordType) {
      case 'noun':
        return this.applyNominalRules(word, context, position, entry);
      
      case 'verb':
        return this.applyVerbalRules(word, context, position, entry);
      
      case 'adjective':
        return this.applyAdjectivalRules(word, context, position, entry);
      
      default:
        return word;
    }
  }

  /**
   * Identifier le type de mot
   */
  identifyWordType(entry: DictionaryEntry): 'noun' | 'verb' | 'adjective' | 'other' {
    if (!entry.part_of_speech) return 'other';

    const pos = entry.part_of_speech.toLowerCase();

    if (pos.includes('n:') || pos.includes('nom')) return 'noun';
    if (pos.includes('v.') || pos.includes('verbe')) return 'verb';
    if (pos.includes('adj')) return 'adjective';

    return 'other';
  }

  /**
   * Appliquer les règles nominales (accord en classe, nombre)
   */
  private applyNominalRules(
    word: string,
    context: string[],
    position: number,
    entry: DictionaryEntry
  ): string {
    // Vérifier si le contexte indique un pluriel
    const previousWord = position > 0 ? context[position - 1]?.toLowerCase() : '';
    const nextWord = position < context.length - 1 ? context[position + 1]?.toLowerCase() : '';

    // Indicateurs de pluriel en français
    const pluralIndicators = ['les', 'des', 'plusieurs', 'beaucoup', 'tous', 'toutes'];
    
    if (pluralIndicators.some(ind => previousWord.includes(ind) || nextWord.includes(ind))) {
      if (entry.plural_form) {
        return entry.plural_form;
      }
    }

    return word;
  }

  /**
   * Appliquer les règles verbales (conjugaison, temps, aspect)
   */
  private applyVerbalRules(
    word: string,
    context: string[],
    position: number,
    entry: DictionaryEntry
  ): string {
    // Détecter le temps/aspect depuis le contexte
    const previousWords = context.slice(Math.max(0, position - 3), position).join(' ').toLowerCase();

    // Futur
    if (previousWords.includes('koo') || previousWords.includes('va') || previousWords.includes('vais') || previousWords.includes('aller')) {
      return entry.verb_root || word; // Racine pour le futur
    }

    // Accompli (passé)
    if (previousWords.includes('a ') || previousWords.includes('ont ') || previousWords.includes('est ') || previousWords.includes('sont ')) {
      // Forme accomplie (généralement terminaison -a pour beaucoup de verbes)
      if (entry.verb_radical) {
        return entry.verb_radical + 'a';
      }
    }

    // Inaccompli (présent progressif)
    if (previousWords.includes('en train') || previousWords.includes('mɔ') || previousWords.includes('est en train')) {
      if (entry.verb_radical) {
        return entry.verb_radical + 'mɔ';
      }
    }

    return word;
  }

  /**
   * Appliquer les règles adjectivales (accord en classe nominale)
   */
  private applyAdjectivalRules(
    word: string,
    context: string[],
    position: number,
    entry: DictionaryEntry
  ): string {
    // Les adjectifs en Baatɔnum s'accordent avec la classe nominale du nom
    // Si on a les formes adjectives, utiliser celle appropriée
    if (entry.adjective_forms) {
      // Chercher le nom auquel l'adjectif se rapporte
      const previousWord = position > 0 ? context[position - 1] : null;
      
      if (previousWord) {
        // Selon la classe du nom, choisir la bonne forme
        // (Cette logique nécessiterait un accès au dictionnaire complet)
        // Pour l'instant, retourner la forme de base
      }
    }

    return word;
  }

  /**
   * Conjuguer un verbe en contexte
   */
  conjugateInContext(verbRoot: string, context: string[], entry?: DictionaryEntry): string {
    if (!entry || !entry.verb_radical) return verbRoot;

    // Détection simple du temps depuis le contexte
    const contextText = context.join(' ').toLowerCase();

    // Futur
    if (contextText.includes('koo') || contextText.includes('va')) {
      return verbRoot; // La racine est utilisée pour le futur
    }

    // Accompli
    if (contextText.includes('a ') || contextText.includes('déjà')) {
      return entry.verb_radical + 'a';
    }

    // Inaccompli
    if (contextText.includes('mɔ') || contextText.includes('en train')) {
      return entry.verb_radical + 'mɔ';
    }

    // Par défaut, retourner la racine
    return verbRoot;
  }

  /**
   * Appliquer l'accord nominal selon la classe
   */
  applyNominalAgreement(adjective: string, nounClass: string): string {
    // Mapping simplifié des classes nominales aux suffixes adjectivaux
    const classToSuffix: Record<string, string> = {
      'b': 'bu',
      'g': 'gu',
      'm': 'mu',
      'n': 'nu',
      's': 'su',
      't': 'ru',
      'w': 'wu',
      'y': 'yu'
    };

    const suffix = classToSuffix[nounClass];
    if (suffix) {
      // Remplacer ou ajouter le suffixe approprié
      // (Logique simplifiée, devrait être plus sophistiquée)
      return adjective + suffix;
    }

    return adjective;
  }

  /**
   * Identifier les suffixes dérivatifs dans un verbe
   */
  identifyDerivationalSuffixes(verb: string): string[] {
    const suffixes: string[] = [];
    const derivationalList = Object.keys(DERIVATIONAL_MEANINGS);

    for (const suffix of derivationalList) {
      if (verb.endsWith(suffix.substring(1))) { // Enlever le '-'
        suffixes.push(suffix);
      }
    }

    return suffixes;
  }

  /**
   * Appliquer un suffixe dérivationnel à un verbe
   */
  applyDerivationalSuffix(verbRadical: string, suffix: string): string {
    const suffixWithoutDash = suffix.startsWith('-') ? suffix.substring(1) : suffix;
    return verbRadical + suffixWithoutDash;
  }
}
