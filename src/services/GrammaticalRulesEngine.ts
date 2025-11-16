// Moteur de règles grammaticales pour le Baatɔnum
// Gère les accords, l'ordre des mots, et les structures syntaxiques

import type { DictionaryEntry } from '@/data/fullDictionaryData';
import { declineAdjective } from '@/utils/baatonumLinguistics';

export interface NounPhrase {
  noun: DictionaryEntry;
  determiner?: string;
  adjectives: string[];
  possessive?: string;
}

export interface VerbPhrase {
  verb: DictionaryEntry;
  tense: 'future' | 'accomplished' | 'inaccomplished' | 'imperative';
  person: '1sg' | '2sg' | '3sg' | '1pl' | '2pl' | '3pl';
  negation: boolean;
}

export interface SentenceElements {
  subject?: NounPhrase;
  verb?: VerbPhrase;
  object?: NounPhrase;
  complements: string[];
}

export interface OrderedElements {
  elements: string[];
  order: 'SVO' | 'SOV';
}

export class GrammaticalRulesEngine {
  /**
   * Appliquer l'accord sujet-verbe selon la classe nominale
   */
  applySubjectVerbAgreement(subject: NounPhrase, verb: VerbPhrase): string {
    const nominalClass = subject.noun.nominal_class || 't';
    const person = this.mapClassToPerson(nominalClass);
    
    // Obtenir la particule selon la personne et le temps
    const particle = this.getVerbParticle(person, verb.tense, verb.negation);
    
    // Construire la forme verbale
    const verbRoot = verb.verb.verb_root || verb.verb.word;
    const verbRadical = verb.verb.verb_radical || verbRoot;
    
    if (verb.tense === 'future') {
      return `${particle} ${verbRoot}`;
    } else if (verb.tense === 'inaccomplished') {
      return `${particle} ${verbRadical}mɔ`;
    } else if (verb.tense === 'accomplished') {
      const accomplished = verb.verb.accomplished_form || `${verbRadical}a`;
      return `${particle} ${accomplished}`;
    }
    
    return `${particle} ${verbRoot}`;
  }

  /**
   * Appliquer l'accord nom-adjectif selon la classe nominale
   */
  applyNounAdjectiveAgreement(noun: DictionaryEntry, adjective: string): string {
    const nominalClass = noun.nominal_class || 't';
    
    // Si l'adjectif a des formes prédéfinies par classe
    if (noun.adjective_forms && typeof noun.adjective_forms === 'object') {
      const forms = noun.adjective_forms as Record<string, string>;
      if (forms[nominalClass]) {
        return forms[nominalClass];
      }
    }
    
    // Sinon, appliquer la déclinaison standard
    return declineAdjective(adjective, nominalClass);
  }

  /**
   * Déterminer l'ordre des mots selon le contexte
   * Le Baatɔnum utilise généralement SVO (Sujet-Verbe-Objet)
   */
  determineWordOrder(elements: SentenceElements): OrderedElements {
    const ordered: string[] = [];
    
    // Construire la phrase dans l'ordre SVO
    if (elements.subject) {
      ordered.push(this.buildNounPhrase(elements.subject));
    }
    
    if (elements.verb && elements.subject) {
      ordered.push(this.applySubjectVerbAgreement(elements.subject, elements.verb));
    }
    
    if (elements.object) {
      ordered.push(this.buildNounPhrase(elements.object));
    }
    
    // Ajouter les compléments à la fin
    ordered.push(...elements.complements);
    
    return {
      elements: ordered,
      order: 'SVO'
    };
  }

  /**
   * Appliquer un déterminant selon la classe nominale
   */
  applyDeterminer(noun: DictionaryEntry, determinerType: 'definite' | 'indefinite' | 'demonstrative'): string {
    const nominalClass = noun.nominal_class || 't';
    
    // Déterminants par classe (simplifiés)
    const determiners: Record<string, Record<string, string>> = {
      'definite': {
        't': 'te', 'b': 'be', 'g': 'ge', 'm': 'me',
        'n': 'ne', 's': 'se', 'w': 'we', 'y': 'ye'
      },
      'demonstrative': {
        't': 'teeru', 'b': 'beeru', 'g': 'geeru', 'm': 'meeru',
        'n': 'neeru', 's': 'seeru', 'w': 'weeru', 'y': 'yeeru'
      }
    };
    
    return determiners[determinerType]?.[nominalClass] || '';
  }

  /**
   * Sélectionner le pronom approprié selon la classe et la fonction
   */
  selectPronoun(
    noun: DictionaryEntry,
    pronounFunction: 'subject' | 'object' | 'possessive'
  ): string {
    const nominalClass = noun.nominal_class || 't';
    
    const pronouns: Record<string, Record<string, string>> = {
      'subject': {
        't': 'u', 'b': 'ba', 'g': 'ga', 'm': 'ma',
        'n': 'na', 's': 'sa', 'w': 'wa', 'y': 'ya'
      },
      'object': {
        't': 'ti', 'b': 'bi', 'g': 'gi', 'm': 'mi',
        'n': 'ni', 's': 'si', 'w': 'wi', 'y': 'yi'
      },
      'possessive': {
        't': 'ta', 'b': 'ba', 'g': 'ga', 'm': 'ma',
        'n': 'na', 's': 'sa', 'w': 'wa', 'y': 'ya'
      }
    };
    
    return pronouns[pronounFunction]?.[nominalClass] || '';
  }

  /**
   * Construire un groupe nominal complet avec tous ses modificateurs
   */
  private buildNounPhrase(phrase: NounPhrase): string {
    const parts: string[] = [];
    
    // Déterminant (optionnel)
    if (phrase.determiner) {
      parts.push(phrase.determiner);
    }
    
    // Nom
    parts.push(phrase.noun.word);
    
    // Adjectifs avec accord
    phrase.adjectives.forEach(adj => {
      parts.push(this.applyNounAdjectiveAgreement(phrase.noun, adj));
    });
    
    // Possessif (optionnel)
    if (phrase.possessive) {
      parts.push(phrase.possessive);
    }
    
    return parts.join(' ');
  }

  /**
   * Obtenir la particule verbale selon la personne, le temps et la négation
   */
  private getVerbParticle(
    person: '1sg' | '2sg' | '3sg' | '1pl' | '2pl' | '3pl',
    tense: 'future' | 'accomplished' | 'inaccomplished' | 'imperative',
    negation: boolean
  ): string {
    if (negation) {
      const negParticles: Record<string, string> = {
        '1sg': 'u ǹ', '2sg': 'ga ǹ', '3sg': 'u ǹ',
        '1pl': 'ta ǹ', '2pl': 'ya ǹ', '3pl': 'ba ǹ'
      };
      return negParticles[person];
    }
    
    if (tense === 'future') {
      const futureParticles: Record<string, string> = {
        '1sg': 'u koo', '2sg': 'ga koo', '3sg': 'u koo',
        '1pl': 'ta koo', '2pl': 'ya koo', '3pl': 'ba koo'
      };
      return futureParticles[person];
    }
    
    // Accompli et inaccompli utilisent les mêmes particules de base
    const baseParticles: Record<string, string> = {
      '1sg': 'u', '2sg': 'ga', '3sg': 'u',
      '1pl': 'ta', '2pl': 'ya', '3pl': 'ba'
    };
    return baseParticles[person];
  }

  /**
   * Mapper une classe nominale à une personne grammaticale
   */
  private mapClassToPerson(nominalClass: string): '3sg' | '3pl' {
    // En Baatɔnum, les noms utilisent généralement la 3ème personne
    return '3sg'; // Peut être étendu selon le contexte
  }

  /**
   * Appliquer les règles de négation
   */
  applyNegation(sentence: string, verb: DictionaryEntry): string {
    // La négation en Baatɔnum utilise "ǹ" et modifie la forme verbale
    const negativeForm = verb.negative_form;
    
    if (negativeForm) {
      // Remplacer la forme affirmative par la forme négative
      const affirmative = verb.accomplished_form || verb.verb_root || verb.word;
      return sentence.replace(affirmative, negativeForm);
    }
    
    // Si pas de forme négative spécifique, ajouter simplement "ǹ"
    return sentence.replace(/^(u|ga|ta|ya|ba)\s/, '$1 ǹ ');
  }

  /**
   * Gérer les verbes de qualité (veq) comme adjectifs
   */
  translateQualityVerb(frenchAdj: string, noun: DictionaryEntry): string {
    // Les verbes de qualité en Baatɔnum fonctionnent comme des prédicats
    // Exemple: "daa te, ta duku" = "Ce marigot est profond"
    
    // Construire: nom + substitut_classe + veq
    const nominalClass = noun.nominal_class || 't';
    const substitut = this.selectPronoun(noun, 'subject');
    
    return `${noun.word} ${substitut}, ${substitut} ${frenchAdj}`;
  }
}