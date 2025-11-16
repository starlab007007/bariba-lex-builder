/**
 * Tokenizer spécialisé pour le Baatɔnum
 * Gère les digraphes (gb, kp, bw, dw, tw, sw), les tons, et les nasales
 */

export class BaatonumTokenizer {
  private vocabulary: Set<string> = new Set();
  private readonly digraphs = ['gb', 'kp', 'bw', 'dw', 'tw', 'sw'];
  private readonly nasalVowels = ['ã', 'ɛ̃', 'ĩ', 'ɔ̃', 'ũ'];
  private readonly toneMarks = ['́', '̀', '̄', '̂', '̌']; // Ton haut, bas, moyen, descendant, montant

  constructor(corpus: string[]) {
    this.buildVocabulary(corpus);
  }

  /**
   * Construire le vocabulaire à partir du corpus
   */
  private buildVocabulary(corpus: string[]): void {
    corpus.forEach(text => {
      const tokens = this.tokenize(text);
      tokens.forEach(token => this.vocabulary.add(token));
    });
    console.log(`📚 Vocabulaire Baatɔnum: ${this.vocabulary.size} tokens uniques`);
  }

  /**
   * Tokeniser un texte en respectant les spécificités du Baatɔnum
   */
  tokenize(text: string): string[] {
    const tokens: string[] = [];
    const words = text.trim().split(/\s+/);

    words.forEach(word => {
      if (!word) return;
      
      // Décomposer le mot en unités linguistiques
      const units = this.decomposeWord(word);
      tokens.push(...units);
    });

    return tokens;
  }

  /**
   * Décomposer un mot en unités (digraphes, caractères simples, tons)
   */
  private decomposeWord(word: string): string[] {
    const units: string[] = [];
    let i = 0;
    let currentToken = '';

    while (i < word.length) {
      // Vérifier les digraphes
      if (i < word.length - 1) {
        const digraph = word.substring(i, i + 2).toLowerCase();
        if (this.digraphs.includes(digraph)) {
          if (currentToken) {
            units.push(currentToken);
            currentToken = '';
          }
          units.push(digraph);
          i += 2;
          continue;
        }
      }

      // Vérifier les marques de ton (caractères combinés)
      const char = word[i];
      if (this.toneMarks.includes(char)) {
        // Les tons sont attachés au caractère précédent
        if (currentToken) {
          currentToken += char;
        }
        i++;
        continue;
      }

      // Vérifier les voyelles nasales
      if (this.nasalVowels.includes(char)) {
        if (currentToken) {
          units.push(currentToken);
          currentToken = '';
        }
        units.push(char);
        i++;
        continue;
      }

      // Caractère ordinaire
      currentToken += char;
      
      // Si on atteint un espace ou la fin, ajouter le token
      if (i === word.length - 1 || /\s/.test(word[i + 1])) {
        if (currentToken) {
          units.push(currentToken);
          currentToken = '';
        }
      }
      
      i++;
    }

    if (currentToken) {
      units.push(currentToken);
    }

    return units.filter(u => u.length > 0);
  }

  /**
   * Détokeniser (réassembler les tokens en texte)
   */
  detokenize(tokens: string[]): string {
    return tokens.join(' ');
  }

  /**
   * Vérifier si un mot existe dans le vocabulaire
   */
  isKnownWord(word: string): boolean {
    return this.vocabulary.has(word.toLowerCase());
  }

  /**
   * Obtenir la taille du vocabulaire
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  /**
   * Extraire les mots du vocabulaire qui commencent par un préfixe
   */
  getWordsStartingWith(prefix: string, limit: number = 10): string[] {
    const results: string[] = [];
    const lowerPrefix = prefix.toLowerCase();

    for (const word of this.vocabulary) {
      if (word.startsWith(lowerPrefix)) {
        results.push(word);
        if (results.length >= limit) break;
      }
    }

    return results;
  }
}
