/**
 * Analyseur Grammatical pour le Français et le Bariba
 * 
 * Analyse la structure grammaticale des phrases (SVO) avant traduction
 * pour produire des traductions naturelles et non littérales
 */

import type { DictionaryEntry } from "@/data/fullDictionaryData";

export interface SentenceStructure {
  subject?: {
    text: string;
    type: 'noun' | 'pronoun' | 'proper_noun';
    number: 'singular' | 'plural';
    person?: '1' | '2' | '3';
  };
  verb?: {
    text: string;
    root: string;
    tense: 'present' | 'past' | 'future' | 'conditional';
    aspect?: 'accomplished' | 'inaccomplished' | 'progressive';
    negation: boolean;
  };
  object?: {
    text: string;
    type: 'direct' | 'indirect';
  };
  complements: Array<{
    text: string;
    type: 'adverbial' | 'prepositional' | 'temporal' | 'locative';
  }>;
  originalText: string;
}

export class GrammaticalAnalyzer {
  private dictionary: DictionaryEntry[] = [];

  // Mots français courants par catégorie
  private frenchPronouns = new Set([
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'moi', 'toi', 'lui', 'nous', 'vous', 'eux', 'elles'
  ]);

  private frenchDeterminers = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cette', 'ces',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'notre', 'nos', 'votre', 'vos', 'leur', 'leurs'
  ]);

  private frenchPrepositions = new Set([
    'à', 'de', 'dans', 'pour', 'avec', 'sans', 'sur', 'sous', 'vers',
    'par', 'entre', 'chez', 'pendant', 'avant', 'après', 'depuis'
  ]);

  private frenchAuxiliaries = new Set([
    'être', 'avoir', 'aller', 'faire', 'pouvoir', 'vouloir', 'devoir'
  ]);

  // Patterns de négation français
  private negationPatterns = [
    { prefix: 'ne', suffix: 'pas' },
    { prefix: 'ne', suffix: 'plus' },
    { prefix: 'ne', suffix: 'jamais' },
    { prefix: 'ne', suffix: 'rien' }
  ];

  constructor(dictionary: DictionaryEntry[]) {
    this.dictionary = dictionary;
  }

  /**
   * Analyse une phrase française et extrait sa structure SVO
   */
  analyzeFrenchSentence(text: string): SentenceStructure {
    const words = this.tokenize(text);
    const structure: SentenceStructure = {
      complements: [],
      originalText: text
    };

    let currentIndex = 0;

    // 1. Identifier le sujet (début de phrase)
    const subjectResult = this.extractSubject(words, currentIndex);
    if (subjectResult) {
      structure.subject = subjectResult.subject;
      currentIndex = subjectResult.nextIndex;
    }

    // 2. Identifier le verbe
    const verbResult = this.extractVerb(words, currentIndex);
    if (verbResult) {
      structure.verb = verbResult.verb;
      currentIndex = verbResult.nextIndex;
    }

    // 3. Identifier l'objet
    const objectResult = this.extractObject(words, currentIndex);
    if (objectResult) {
      structure.object = objectResult.object;
      currentIndex = objectResult.nextIndex;
    }

    // 4. Le reste = compléments
    if (currentIndex < words.length) {
      const remaining = words.slice(currentIndex).join(' ');
      structure.complements.push({
        text: remaining,
        type: this.classifyComplement(remaining)
      });
    }

    return structure;
  }

  /**
   * Analyse une phrase bariba et extrait sa structure
   */
  analyzeBaribasentence(text: string): SentenceStructure {
    const words = this.tokenize(text);
    const structure: SentenceStructure = {
      complements: [],
      originalText: text
    };

    // Le Bariba suit généralement SVO comme le français
    // Mais avec des particules aspectuelles

    let currentIndex = 0;

    // Identifier sujet (souvent pronom de classe)
    if (currentIndex < words.length) {
      structure.subject = {
        text: words[currentIndex],
        type: 'pronoun',
        number: 'singular'
      };
      currentIndex++;
    }

    // Identifier particule + verbe
    if (currentIndex < words.length - 1) {
      const particle = words[currentIndex];
      const verbRoot = words[currentIndex + 1];
      
      structure.verb = {
        text: `${particle} ${verbRoot}`,
        root: verbRoot,
        tense: this.inferTenseFromParticle(particle),
        aspect: this.inferAspectFromParticle(particle),
        negation: particle === 'ka' || words.includes('sa')
      };
      currentIndex += 2;
    }

    // Le reste = objet + compléments
    if (currentIndex < words.length) {
      const remaining = words.slice(currentIndex);
      if (remaining.length > 0) {
        structure.object = {
          text: remaining[0],
          type: 'direct'
        };
        
        if (remaining.length > 1) {
          structure.complements.push({
            text: remaining.slice(1).join(' '),
            type: 'adverbial'
          });
        }
      }
    }

    return structure;
  }

  private extractSubject(
    words: string[],
    startIndex: number
  ): { subject: SentenceStructure['subject']; nextIndex: number } | null {
    if (startIndex >= words.length) return null;

    const word = words[startIndex].toLowerCase();

    // Pronom personnel
    if (this.frenchPronouns.has(word)) {
      return {
        subject: {
          text: word,
          type: 'pronoun',
          number: ['nous', 'vous', 'ils', 'elles'].includes(word) ? 'plural' : 'singular',
          person: this.getPersonFromPronoun(word)
        },
        nextIndex: startIndex + 1
      };
    }

    // Groupe nominal (déterminant + nom + [adjectifs])
    let nextIndex = startIndex;
    let subjectText = '';

    // Déterminant optionnel
    if (this.frenchDeterminers.has(word)) {
      subjectText = word;
      nextIndex++;
    }

    // Nom (obligatoire)
    if (nextIndex < words.length) {
      subjectText += (subjectText ? ' ' : '') + words[nextIndex];
      nextIndex++;

      // Adjectifs optionnels
      while (nextIndex < words.length && !this.isVerbCandidate(words[nextIndex])) {
        subjectText += ' ' + words[nextIndex];
        nextIndex++;
      }

      return {
        subject: {
          text: subjectText.trim(),
          type: 'noun',
          number: this.inferNumber(subjectText)
        },
        nextIndex
      };
    }

    return null;
  }

  private extractVerb(
    words: string[],
    startIndex: number
  ): { verb: SentenceStructure['verb']; nextIndex: number } | null {
    if (startIndex >= words.length) return null;

    let negation = false;
    let nextIndex = startIndex;

    // Détecter négation (ne)
    if (words[nextIndex].toLowerCase() === 'ne' || words[nextIndex].toLowerCase() === "n'") {
      negation = true;
      nextIndex++;
    }

    if (nextIndex >= words.length) return null;

    const verbText = words[nextIndex];
    const verbRoot = this.findVerbRoot(verbText);

    // Si "pas", "plus", etc. après le verbe, c'est bien une négation
    if (nextIndex + 1 < words.length) {
      const nextWord = words[nextIndex + 1].toLowerCase();
      if (['pas', 'plus', 'jamais', 'rien'].includes(nextWord)) {
        negation = true;
        nextIndex++; // consommer le mot de négation
      }
    }

    return {
      verb: {
        text: verbText,
        root: verbRoot,
        tense: this.inferTense(verbText),
        negation,
        aspect: this.inferAspect(verbText)
      },
      nextIndex: nextIndex + 1
    };
  }

  private extractObject(
    words: string[],
    startIndex: number
  ): { object: SentenceStructure['object']; nextIndex: number } | null {
    if (startIndex >= words.length) return null;

    let objectText = '';
    let nextIndex = startIndex;
    let isIndirect = false;

    // Objet indirect (préposition)
    if (this.frenchPrepositions.has(words[nextIndex].toLowerCase())) {
      isIndirect = true;
      objectText = words[nextIndex];
      nextIndex++;
    }

    // Construire le groupe nominal
    while (nextIndex < words.length && !this.frenchPrepositions.has(words[nextIndex].toLowerCase())) {
      objectText += (objectText ? ' ' : '') + words[nextIndex];
      nextIndex++;
      
      // Arrêter à la première virgule ou ponctuation forte
      if (words[nextIndex - 1].match(/[,;.!?]/)) {
        break;
      }
    }

    if (!objectText.trim()) return null;

    return {
      object: {
        text: objectText.trim(),
        type: isIndirect ? 'indirect' : 'direct'
      },
      nextIndex
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/['']/g, "'")
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  private isVerbCandidate(word: string): boolean {
    const lowered = word.toLowerCase();
    // Détection simple: si ça finit par -er, -ir, -re, -oir ou forme conjuguée
    return (
      lowered.endsWith('er') ||
      lowered.endsWith('ir') ||
      lowered.endsWith('re') ||
      lowered.endsWith('oir') ||
      lowered.endsWith('e') ||
      lowered.endsWith('es') ||
      lowered.endsWith('ent') ||
      lowered.endsWith('a') ||
      lowered.endsWith('ont') ||
      this.frenchAuxiliaries.has(lowered)
    );
  }

  private findVerbRoot(conjugatedForm: string): string {
    // Chercher dans le dictionnaire
    const entry = this.dictionary.find(e => 
      e.word.toLowerCase() === conjugatedForm.toLowerCase() ||
      e.verb_root?.toLowerCase() === conjugatedForm.toLowerCase()
    );

    if (entry?.verb_root) {
      return entry.verb_root;
    }

    // Sinon, heuristique simple
    if (conjugatedForm.endsWith('er') || conjugatedForm.endsWith('ir')) {
      return conjugatedForm;
    }

    return conjugatedForm;
  }

  private inferTense(verbForm: string): SentenceStructure['verb']['tense'] {
    if (verbForm.endsWith('ai') || verbForm.endsWith('as') || verbForm.endsWith('era')) {
      return 'future';
    }
    if (verbForm.endsWith('ait') || verbForm.endsWith('é') || verbForm.endsWith('a')) {
      return 'past';
    }
    if (verbForm.endsWith('ais') || verbForm.endsWith('rait')) {
      return 'conditional';
    }
    return 'present';
  }

  private inferAspect(verbForm: string): SentenceStructure['verb']['aspect'] {
    // Très simplifié
    return undefined;
  }

  private inferNumber(text: string): 'singular' | 'plural' {
    const lowered = text.toLowerCase();
    return (
      lowered.includes('les') ||
      lowered.includes('des') ||
      lowered.includes('mes') ||
      lowered.includes('tes') ||
      lowered.includes('ses')
    ) ? 'plural' : 'singular';
  }

  private getPersonFromPronoun(pronoun: string): '1' | '2' | '3' {
    if (['je', 'moi', 'nous'].includes(pronoun)) return '1';
    if (['tu', 'toi', 'vous'].includes(pronoun)) return '2';
    return '3';
  }

  private classifyComplement(text: string): SentenceStructure['complements'][0]['type'] {
    const lowered = text.toLowerCase();
    
    if (lowered.match(/\b(hier|aujourd'hui|demain|maintenant|toujours|souvent)\b/)) {
      return 'temporal';
    }
    if (lowered.match(/\b(ici|là|là-bas|dehors|dedans)\b/)) {
      return 'locative';
    }
    if (this.frenchPrepositions.has(lowered.split(' ')[0])) {
      return 'prepositional';
    }
    
    return 'adverbial';
  }

  private inferTenseFromParticle(particle: string): SentenceStructure['verb']['tense'] {
    const tenseMap: Record<string, SentenceStructure['verb']['tense']> = {
      'na': 'future',
      'ka': 'past',
      'ma': 'present',
      'gba': 'conditional'
    };
    return tenseMap[particle] || 'present';
  }

  private inferAspectFromParticle(particle: string): SentenceStructure['verb']['aspect'] {
    const aspectMap: Record<string, SentenceStructure['verb']['aspect']> = {
      'ka': 'accomplished',
      'ma': 'inaccomplished',
      'ba': 'progressive'
    };
    return aspectMap[particle];
  }
}
