/**
 * Service de traduction offline utilisant le dictionnaire embarqué
 * Charge traducteur_final.json en IndexedDB pour recherche rapide
 */

import { indexedDBService } from './IndexedDBService';

interface DictionaryEntry {
  id: string;
  french: string;
  bariba: string;
  frenchNormalized: string;
  baribaNormalized: string;
}

interface OfflineTranslationResult {
  translation: string;
  confidence: number;
  method: 'exact' | 'fuzzy' | 'partial' | 'not_found';
  source: 'dictionary' | 'cache';
}

class OfflineTranslationService {
  private initialized = false;
  private dictionaryLoaded = false;
  private frenchIndex: Map<string, DictionaryEntry> = new Map();
  private baribaIndex: Map<string, DictionaryEntry> = new Map();
  private allEntries: DictionaryEntry[] = [];

  async init(): Promise<void> {
    if (this.initialized) return;
    await indexedDBService.init();
    this.initialized = true;
  }

  // Charger le dictionnaire depuis IndexedDB ou le fichier JSON
  async loadDictionary(onProgress?: (current: number, total: number, phase: string) => void): Promise<boolean> {
    await this.init();

    try {
      // Vérifier si déjà chargé en IndexedDB
      const count = await indexedDBService.count('dictionary');
      const lastLoad = await indexedDBService.getMetadata<number>('dictionary_loaded_at');
      
      if (count > 1000 && lastLoad) {
        console.log('[OfflineTranslation] Dictionnaire déjà en IndexedDB:', count, 'entrées');
        await this.buildIndexFromDB(onProgress);
        return true;
      }

      // Charger depuis le fichier JSON
      onProgress?.(0, 100, 'Téléchargement du dictionnaire...');
      
      const response = await fetch('/traducteur_final.json');
      if (!response.ok) throw new Error('Impossible de charger le dictionnaire');
      
      const data = await response.json();
      
      onProgress?.(30, 100, 'Traitement des entrées...');
      
      // Convertir en format IndexedDB
      const entries: DictionaryEntry[] = [];
      let processed = 0;
      
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.french && item.bariba) {
            entries.push({
              id: `${processed}`,
              french: item.french,
              bariba: item.bariba,
              frenchNormalized: this.normalize(item.french),
              baribaNormalized: this.normalize(item.bariba)
            });
            processed++;
          }
        }
      } else if (typeof data === 'object') {
        // Format clé-valeur
        for (const [french, bariba] of Object.entries(data)) {
          if (typeof bariba === 'string') {
            entries.push({
              id: `${processed}`,
              french,
              bariba,
              frenchNormalized: this.normalize(french),
              baribaNormalized: this.normalize(bariba)
            });
            processed++;
          }
        }
      }

      console.log('[OfflineTranslation] Entrées traitées:', entries.length);
      
      onProgress?.(50, 100, 'Sauvegarde en cache local...');

      // Sauvegarder en IndexedDB par lots
      const batchSize = 1000;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        await indexedDBService.bulkPut('dictionary', batch);
        onProgress?.(50 + Math.round((i / entries.length) * 40), 100, 'Sauvegarde en cache local...');
      }

      await indexedDBService.setMetadata('dictionary_loaded_at', Date.now());
      await indexedDBService.setMetadata('dictionary_count', entries.length);

      onProgress?.(90, 100, 'Construction des index...');
      
      // Construire les index en mémoire
      this.buildIndex(entries);
      
      onProgress?.(100, 100, 'Terminé!');
      
      this.dictionaryLoaded = true;
      console.log('[OfflineTranslation] Dictionnaire chargé:', entries.length, 'entrées');
      
      return true;
    } catch (error) {
      console.error('[OfflineTranslation] Erreur chargement dictionnaire:', error);
      return false;
    }
  }

  private async buildIndexFromDB(onProgress?: (current: number, total: number, phase: string) => void): Promise<void> {
    onProgress?.(0, 100, 'Chargement depuis le cache...');
    
    const entries = await indexedDBService.getAll<DictionaryEntry>('dictionary');
    
    onProgress?.(50, 100, 'Construction des index...');
    
    this.buildIndex(entries);
    
    onProgress?.(100, 100, 'Prêt!');
    
    this.dictionaryLoaded = true;
  }

  private buildIndex(entries: DictionaryEntry[]): void {
    this.allEntries = entries;
    this.frenchIndex.clear();
    this.baribaIndex.clear();

    for (const entry of entries) {
      this.frenchIndex.set(entry.frenchNormalized, entry);
      this.baribaIndex.set(entry.baribaNormalized, entry);
    }

    console.log('[OfflineTranslation] Index construits:', this.frenchIndex.size, 'français,', this.baribaIndex.size, 'bariba');
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^\w\s]/g, '') // Supprimer la ponctuation
      .replace(/\s+/g, ' ');
  }

  // Traduire un texte
  async translate(text: string, from: 'french' | 'bariba', to: 'french' | 'bariba'): Promise<OfflineTranslationResult> {
    if (!this.dictionaryLoaded) {
      await this.loadDictionary();
    }

    const normalized = this.normalize(text);
    const sourceIndex = from === 'french' ? this.frenchIndex : this.baribaIndex;

    // 1. Correspondance exacte
    const exact = sourceIndex.get(normalized);
    if (exact) {
      return {
        translation: to === 'french' ? exact.french : exact.bariba,
        confidence: 1.0,
        method: 'exact',
        source: 'dictionary'
      };
    }

    // 2. Recherche fuzzy (Levenshtein)
    const fuzzyResult = this.fuzzySearch(normalized, from);
    if (fuzzyResult && fuzzyResult.similarity > 0.8) {
      return {
        translation: to === 'french' ? fuzzyResult.entry.french : fuzzyResult.entry.bariba,
        confidence: fuzzyResult.similarity,
        method: 'fuzzy',
        source: 'dictionary'
      };
    }

    // 3. Recherche partielle (contient)
    const partialResult = this.partialSearch(normalized, from);
    if (partialResult) {
      return {
        translation: to === 'french' ? partialResult.french : partialResult.bariba,
        confidence: 0.6,
        method: 'partial',
        source: 'dictionary'
      };
    }

    // 4. Traduction mot à mot pour les phrases
    const words = text.split(/\s+/);
    if (words.length > 1) {
      const translated = await this.translateWordByWord(words, from, to);
      if (translated.some(t => t !== null)) {
        return {
          translation: translated.map((t, i) => t || words[i]).join(' '),
          confidence: translated.filter(t => t !== null).length / words.length * 0.5,
          method: 'partial',
          source: 'dictionary'
        };
      }
    }

    return {
      translation: text,
      confidence: 0,
      method: 'not_found',
      source: 'dictionary'
    };
  }

  private fuzzySearch(normalized: string, from: 'french' | 'bariba'): { entry: DictionaryEntry; similarity: number } | null {
    let bestMatch: DictionaryEntry | null = null;
    let bestSimilarity = 0;

    // Limiter la recherche pour les performances
    const searchField = from === 'french' ? 'frenchNormalized' : 'baribaNormalized';
    
    for (const entry of this.allEntries) {
      const target = entry[searchField];
      
      // Optimisation: ignorer si la différence de longueur est trop grande
      if (Math.abs(target.length - normalized.length) > 3) continue;
      
      const similarity = this.calculateSimilarity(normalized, target);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
      
      // Si on trouve une correspondance presque parfaite, arrêter
      if (similarity > 0.95) break;
    }

    return bestMatch ? { entry: bestMatch, similarity: bestSimilarity } : null;
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Algorithme de Jaro-Winkler simplifié
    const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
    const aMatches = new Array(a.length).fill(false);
    const bMatches = new Array(b.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, b.length);

      for (let j = start; j < end; j++) {
        if (bMatches[j] || a[i] !== b[j]) continue;
        aMatches[i] = bMatches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < a.length; i++) {
      if (!aMatches[i]) continue;
      while (!bMatches[k]) k++;
      if (a[i] !== b[k]) transpositions++;
      k++;
    }

    const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

    // Bonus préfixe commun (Winkler)
    let prefix = 0;
    for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
      if (a[i] === b[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  }

  private partialSearch(normalized: string, from: 'french' | 'bariba'): DictionaryEntry | null {
    const searchField = from === 'french' ? 'frenchNormalized' : 'baribaNormalized';
    
    for (const entry of this.allEntries) {
      const target = entry[searchField];
      if (target.includes(normalized) || normalized.includes(target)) {
        return entry;
      }
    }
    
    return null;
  }

  private async translateWordByWord(words: string[], from: 'french' | 'bariba', to: 'french' | 'bariba'): Promise<(string | null)[]> {
    const results: (string | null)[] = [];
    
    for (const word of words) {
      const normalized = this.normalize(word);
      const sourceIndex = from === 'french' ? this.frenchIndex : this.baribaIndex;
      const exact = sourceIndex.get(normalized);
      
      if (exact) {
        results.push(to === 'french' ? exact.french : exact.bariba);
      } else {
        results.push(null);
      }
    }
    
    return results;
  }

  // Statistiques
  async getStats(): Promise<{ totalEntries: number; loadedAt: Date | null; isLoaded: boolean }> {
    const count = await indexedDBService.getMetadata<number>('dictionary_count');
    const loadedAt = await indexedDBService.getMetadata<number>('dictionary_loaded_at');
    
    return {
      totalEntries: count || 0,
      loadedAt: loadedAt ? new Date(loadedAt) : null,
      isLoaded: this.dictionaryLoaded
    };
  }

  get isLoaded(): boolean {
    return this.dictionaryLoaded;
  }

  async clear(): Promise<void> {
    await indexedDBService.clear('dictionary');
    this.frenchIndex.clear();
    this.baribaIndex.clear();
    this.allEntries = [];
    this.dictionaryLoaded = false;
    console.log('[OfflineTranslation] Cache dictionnaire vidé');
  }
}

export const offlineTranslationService = new OfflineTranslationService();
