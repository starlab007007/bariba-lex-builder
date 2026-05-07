/**
 * Algorithmes de recherche intelligents pour le dictionnaire
 */

// Calcul de la distance de Levenshtein (similarité orthographique)
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialiser la matrice
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Remplir la matrice
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

// Calcul du score de similarité (0-1)
export function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1.0 - distance / maxLen;
}

// Normalisation phonétique simple pour Bààtɔ̀nú
export function normalizePhonetic(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
    .replace(/[ɔ]/g, 'o')
    .replace(/[ɛ]/g, 'e')
    .replace(/[ã]/g, 'a')
    .replace(/[ĩ]/g, 'i')
    .replace(/[ũ]/g, 'u')
    .replace(/[ŋ]/g, 'n')
    .trim();
}

// Recherche phonétique
export function phoneticMatch(query: string, target: string): boolean {
  const normalizedQuery = normalizePhonetic(query);
  const normalizedTarget = normalizePhonetic(target);
  return normalizedTarget.includes(normalizedQuery);
}

// Score de pertinence composite
export interface RelevanceScore {
  exactMatch: boolean;
  prefixMatch: boolean;
  containsMatch: boolean;
  phoneticMatch: boolean;
  similarityScore: number;
  totalScore: number;
}

export function calculateRelevance(query: string, target: string): RelevanceScore {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  const exactMatch = queryLower === targetLower;
  const prefixMatch = targetLower.startsWith(queryLower);
  const containsMatch = targetLower.includes(queryLower);
  const phonMatch = phoneticMatch(query, target);
  const simScore = similarityScore(query, target);
  
  // Calcul du score total pondéré
  let totalScore = 0;
  if (exactMatch) totalScore += 100;
  else if (prefixMatch) totalScore += 80;
  else if (containsMatch) totalScore += 60;
  
  if (phonMatch) totalScore += 20;
  totalScore += simScore * 40; // Similarité contribue jusqu'à 40 points
  
  return {
    exactMatch,
    prefixMatch,
    containsMatch,
    phoneticMatch: phonMatch,
    similarityScore: simScore,
    totalScore
  };
}

// Trie (arbre préfixe) pour recherche rapide
export class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
  entries: any[] = [];
}

export class Trie {
  private root: TrieNode = new TrieNode();

  insert(word: string, entry: any): void {
    let node = this.root;
    const normalized = word.toLowerCase();
    
    for (const char of normalized) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    
    node.isEndOfWord = true;
    node.entries.push(entry);
  }

  search(prefix: string): any[] {
    let node = this.root;
    const normalized = prefix.toLowerCase();
    
    for (const char of normalized) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }
    
    return this.collectAllEntries(node);
  }

  private collectAllEntries(node: TrieNode): any[] {
    const results: any[] = [...node.entries];
    
    for (const child of node.children.values()) {
      results.push(...this.collectAllEntries(child));
    }
    
    return results;
  }
}

// Cache LRU pour les recherches fréquentes
export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // Déplacer à la fin (plus récent)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Supprimer le plus ancien (premier élément)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}
