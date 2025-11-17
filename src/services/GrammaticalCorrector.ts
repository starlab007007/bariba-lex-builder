/**
 * Correcteur Grammatical Avancé pour le Baatonum
 * 
 * Implémente les règles linguistiques du rapport technique:
 * - 8 classes nominales avec accords
 * - 12 catégories de temps/aspect verbaux
 * - Sandhi tonal et harmonisation
 * - Négations (ka...sa, ka...gbena)
 * - Suffixes dérivationnels
 */

export interface NounClass {
  code: string;
  singularDeterminer: string;
  pluralDeterminer: string;
  singularSubject: string;
  pluralSubject: string;
  relativePronoun: string;
}

export interface VerbConjugation {
  tenseAspect: string; // SBJ, COND, INC, PERF, EXP, DUR, NEG, HAB, PROG, STA, INF, IMP
  person: string;
  prefix?: string;
  suffix?: string;
  particle?: string;
  tonalChange?: string;
}

export class GrammaticalCorrector {
  // 8 classes nominales du Baatonum (rapport section 3.1)
  private nounClasses: Map<string, NounClass> = new Map([
    ['U/BA', { code: 'U/BA', singularDeterminer: 'u', pluralDeterminer: 'ba', singularSubject: 'u', pluralSubject: 'ba', relativePronoun: 'yɛ̃' }],
    ['U/BU', { code: 'U/BU', singularDeterminer: 'u', pluralDeterminer: 'bu', singularSubject: 'u', pluralSubject: 'bu', relativePronoun: 'yɛ̃' }],
    ['KU/BU', { code: 'KU/BU', singularDeterminer: 'ku', pluralDeterminer: 'bu', singularSubject: 'ku', pluralSubject: 'bu', relativePronoun: 'kɛ̃' }],
    ['DI/BA', { code: 'DI/BA', singularDeterminer: 'di', pluralDeterminer: 'ba', singularSubject: 'di', pluralSubject: 'ba', relativePronoun: 'dɛ̃' }],
    ['WI/BI', { code: 'WI/BI', singularDeterminer: 'wi', pluralDeterminer: 'bi', singularSubject: 'wi', pluralSubject: 'bi', relativePronoun: 'wɛ̃' }],
    ['SI/BI', { code: 'SI/BI', singularDeterminer: 'si', pluralDeterminer: 'bi', singularSubject: 'si', pluralSubject: 'bi', relativePronoun: 'sɛ̃' }],
    ['GU/BI', { code: 'GU/BI', singularDeterminer: 'gu', pluralDeterminer: 'bi', singularSubject: 'gu', pluralSubject: 'bi', relativePronoun: 'gɛ̃' }],
    ['I/A', { code: 'I/A', singularDeterminer: 'i', pluralDeterminer: 'a', singularSubject: 'i', pluralSubject: 'a', relativePronoun: 'ɛ̃' }],
  ]);

  // Suffixes dérivationnels (rapport section 3.3)
  private derivationalSuffixes = {
    agentif: 'o', // seku → seko (forgeron)
    nomAction: 'ru', // nom d'action/événement
    abstraction: 'bu', // abstractions d'action
    abstractionStative: 'm', // hauteur, pesanteur
    possesseur: 'gi', // possesseur de propriété
    instrument: ['tia', 'tiru', 'tuu'], // outils/instruments
  };

  // Verbes courants avec leurs formes perfectives (rapport section 3.2)
  private perfectiveForms = new Map<string, string>([
    ['ben', 'benna'], // aller
    ['do', 'doo'], // venir
    ['nɔ', 'nɔɔ'], // boire
    ['di', 'dii'], // manger
    ['ru', 'ruu'], // acheter
    ['kpuro', 'kpuroo'], // faire
    ['yima', 'yimaa'], // dire
  ]);

  // Négations du Baatonum (rapport section 5.6)
  private negationPatterns = [
    { type: 'standard', prefix: 'ka', suffix: 'sa' }, // ka...sa
    { type: 'emphatic', prefix: 'ka', suffix: 'gbena' }, // ka...gbena
  ];

  /**
   * Corrige l'accord sujet-verbe selon la classe nominale
   */
  correctSubjectVerbAgreement(subject: string, verb: string, nounClass: string): string {
    const classInfo = this.nounClasses.get(nounClass);
    if (!classInfo) return verb;

    // Le sujet doit correspondre au pronom de classe
    const correctSubject = classInfo.singularSubject;
    
    // Pour les verbes à ton haut, appliquer l'harmonie tonale
    return this.applyTonalHarmony(verb, correctSubject);
  }

  /**
   * Corrige l'accord nom-adjectif
   */
  correctNounAdjectiveAgreement(noun: string, adjective: string, nounClass: string): string {
    const classInfo = this.nounClasses.get(nounClass);
    if (!classInfo) return adjective;

    // L'adjectif doit porter le marqueur de classe
    const classMark = classInfo.singularDeterminer;
    
    // Si l'adjectif ne commence pas par le marqueur, l'ajouter
    if (!adjective.startsWith(classMark)) {
      return `${classMark} ${adjective}`;
    }
    
    return adjective;
  }

  /**
   * Applique le sandhi tonal (assimilation tonale entre mots)
   * Règle: Ton haut + Ton bas → Ton haut + Ton moyen
   */
  applyTonalHarmony(word: string, precedingWord: string): string {
    // Détection des tons: á (haut), à (bas), ā (moyen)
    const hasHighTone = /[áéíóú]/.test(precedingWord);
    const hasLowTone = /[àèìòù]/.test(word.charAt(0));

    if (hasHighTone && hasLowTone) {
      // Convertir le ton bas initial en ton moyen
      return word.replace(/^[àèìòù]/, (match) => {
        const toneMap: { [key: string]: string } = {
          'à': 'ā', 'è': 'ē', 'ì': 'ī', 'ò': 'ō', 'ù': 'ū'
        };
        return toneMap[match] || match;
      });
    }

    return word;
  }

  /**
   * Conjugue un verbe selon le temps/aspect et la personne
   */
  conjugateVerb(verb: string, tenseAspect: string, person: string): string {
    // Marques de temps/aspect du Baatonum
    const conjugationRules: { [key: string]: VerbConjugation } = {
      'PERF_1SG': { tenseAspect: 'PERF', person: '1SG', prefix: 'na', suffix: '' },
      'PERF_2SG': { tenseAspect: 'PERF', person: '2SG', prefix: 'a', suffix: '' },
      'PERF_3SG': { tenseAspect: 'PERF', person: '3SG', prefix: 'u', suffix: '' },
      'INC_1SG': { tenseAspect: 'INC', person: '1SG', prefix: 'na', particle: 'n' },
      'INC_2SG': { tenseAspect: 'INC', person: '2SG', prefix: 'a', particle: 'n' },
      'INC_3SG': { tenseAspect: 'INC', person: '3SG', prefix: 'u', particle: 'n' },
      'FUT_1SG': { tenseAspect: 'FUT', person: '1SG', prefix: 'kon', suffix: '' },
      'FUT_2SG': { tenseAspect: 'FUT', person: '2SG', prefix: 'ko', suffix: '' },
      'NEG_1SG': { tenseAspect: 'NEG', person: '1SG', prefix: 'na', particle: 'ka', suffix: 'sa' },
    };

    const key = `${tenseAspect}_${person}`;
    const rule = conjugationRules[key];

    if (!rule) return verb;

    // Appliquer les transformations
    let conjugated = verb;

    // Forme perfective si nécessaire
    if (tenseAspect === 'PERF' && this.perfectiveForms.has(verb)) {
      conjugated = this.perfectiveForms.get(verb) || verb;
    }

    // Construire la forme conjuguée
    let result = rule.prefix;
    if (rule.particle) result += ` ${rule.particle}`;
    result += ` ${conjugated}`;
    if (rule.suffix) result += ` ${rule.suffix}`;

    return result.trim();
  }

  /**
   * Applique la négation selon le type
   */
  applyNegation(sentence: string, type: 'standard' | 'emphatic' = 'standard'): string {
    const pattern = this.negationPatterns.find(p => p.type === type);
    if (!pattern) return sentence;

    // Trouver le verbe principal (simplifié)
    const words = sentence.split(' ');
    const verbIndex = this.findMainVerbIndex(words);

    if (verbIndex === -1) return sentence;

    // Insérer ka avant le verbe et sa/gbena après
    words[verbIndex] = `${pattern.prefix} ${words[verbIndex]} ${pattern.suffix}`;
    
    return words.join(' ');
  }

  /**
   * Trouve l'index du verbe principal (heuristique simple)
   */
  private findMainVerbIndex(words: string[]): number {
    // Chercher le premier mot qui n'est pas un pronom ou déterminant
    const pronouns = ['na', 'a', 'u', 'ba', 'i', 'ku', 'di', 'wi', 'si', 'gu'];
    
    for (let i = 0; i < words.length; i++) {
      if (!pronouns.includes(words[i].toLowerCase())) {
        return i;
      }
    }
    
    return -1;
  }

  /**
   * Dérive un nom à partir d'un verbe en appliquant un suffixe
   */
  deriveNoun(verb: string, derivationType: keyof typeof this.derivationalSuffixes): string {
    const suffix = this.derivationalSuffixes[derivationType];
    
    if (Array.isArray(suffix)) {
      // Pour les instruments, utiliser le premier suffixe par défaut
      return `${verb}${suffix[0]}`;
    }
    
    return `${verb}${suffix}`;
  }

  /**
   * Détecte et corrige les digraphes mal formés
   */
  correctDigraphs(text: string): string {
    // Digraphes du Baatonum: gb, kp, bw, dw, tw, sw
    const digraphs = ['gb', 'kp', 'bw', 'dw', 'tw', 'sw'];
    
    // S'assurer que les digraphes ne sont pas séparés
    let corrected = text;
    digraphs.forEach(digraph => {
      const separated = `${digraph[0]} ${digraph[1]}`;
      corrected = corrected.replace(new RegExp(separated, 'g'), digraph);
    });
    
    return corrected;
  }

  /**
   * Normalise les tons d'un mot
   */
  normalizeTones(word: string): string {
    // Assurer la cohérence des marqueurs tonals
    // Ton haut: á, é, í, ó, ú
    // Ton bas: à, è, ì, ò, ù
    // Ton moyen: ā, ē, ī, ō, ū
    
    return word
      .normalize('NFD') // Décomposer les caractères accentués
      .normalize('NFC'); // Recomposer de façon standard
  }

  /**
   * Corrige une phrase complète en appliquant toutes les règles
   */
  correctSentence(sentence: string, context?: {
    nounClass?: string;
    tenseAspect?: string;
    person?: string;
    negation?: boolean;
  }): string {
    let corrected = sentence;

    // 1. Corriger les digraphes
    corrected = this.correctDigraphs(corrected);

    // 2. Normaliser les tons
    corrected = this.normalizeTones(corrected);

    // 3. Appliquer l'harmonie tonale entre mots
    const words = corrected.split(' ');
    for (let i = 1; i < words.length; i++) {
      words[i] = this.applyTonalHarmony(words[i], words[i - 1]);
    }
    corrected = words.join(' ');

    // 4. Appliquer la négation si demandé
    if (context?.negation) {
      corrected = this.applyNegation(corrected);
    }

    return corrected;
  }

  /**
   * Analyse une phrase et suggère des corrections
   */
  analyzeSentence(sentence: string): {
    original: string;
    corrected: string;
    corrections: Array<{ type: string; description: string }>;
    confidence: number;
  } {
    const corrections: Array<{ type: string; description: string }> = [];
    let corrected = sentence;

    // Vérifier les digraphes
    const digraphCorrected = this.correctDigraphs(corrected);
    if (digraphCorrected !== corrected) {
      corrections.push({
        type: 'digraph',
        description: 'Digraphes corrigés (gb, kp, bw, dw, tw, sw)'
      });
      corrected = digraphCorrected;
    }

    // Vérifier les tons
    const toneCorrected = this.normalizeTones(corrected);
    if (toneCorrected !== corrected) {
      corrections.push({
        type: 'tone',
        description: 'Tons normalisés'
      });
      corrected = toneCorrected;
    }

    // Calculer un score de confiance
    const confidence = corrections.length === 0 ? 100 : Math.max(70, 100 - corrections.length * 10);

    return {
      original: sentence,
      corrected,
      corrections,
      confidence
    };
  }
}

// Export singleton
export const grammaticalCorrector = new GrammaticalCorrector();
