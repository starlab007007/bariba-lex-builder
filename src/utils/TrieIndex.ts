/**
 * Trie Index for ultra-fast phrase lookup
 * O(m) search complexity where m = phrase length
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  translation?: string;
  confidence?: number;
}

export class TrieIndex {
  private root: TrieNode = { children: new Map(), isEnd: false };
  private size = 0;

  /**
   * Build Trie from phrase pairs
   */
  buildFromPairs(pairs: Array<{ french: string; bariba: string }>): void {
    console.log('🌳 Building Trie index...');
    const startTime = Date.now();

    for (const pair of pairs) {
      this.insert(pair.french.toLowerCase(), pair.bariba, 1.0);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Trie built: ${this.size} entries in ${duration}s`);
  }

  /**
   * Insert a phrase into the Trie
   */
  insert(phrase: string, translation: string, confidence: number): void {
    let node = this.root;
    
    for (const char of phrase) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEnd: false });
      }
      node = node.children.get(char)!;
    }
    
    node.isEnd = true;
    node.translation = translation;
    node.confidence = confidence;
    this.size++;
  }

  /**
   * Search for exact match
   */
  search(phrase: string): { translation: string; confidence: number } | null {
    let node = this.root;
    const normalizedPhrase = phrase.toLowerCase();
    
    for (const char of normalizedPhrase) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }
    
    if (node.isEnd && node.translation) {
      return {
        translation: node.translation,
        confidence: node.confidence || 1.0
      };
    }
    
    return null;
  }

  /**
   * Find all phrases starting with prefix
   */
  findByPrefix(prefix: string, maxResults: number = 10): Array<{
    phrase: string;
    translation: string;
    confidence: number;
  }> {
    const results: Array<{
      phrase: string;
      translation: string;
      confidence: number;
    }> = [];
    
    let node = this.root;
    const normalizedPrefix = prefix.toLowerCase();
    
    // Navigate to prefix node
    for (const char of normalizedPrefix) {
      if (!node.children.has(char)) {
        return results;
      }
      node = node.children.get(char)!;
    }
    
    // DFS to collect all completions
    this.collectCompletions(node, normalizedPrefix, results, maxResults);
    
    return results;
  }

  /**
   * Collect all completions from a node (DFS)
   */
  private collectCompletions(
    node: TrieNode,
    currentPhrase: string,
    results: Array<{ phrase: string; translation: string; confidence: number }>,
    maxResults: number
  ): void {
    if (results.length >= maxResults) {
      return;
    }
    
    if (node.isEnd && node.translation) {
      results.push({
        phrase: currentPhrase,
        translation: node.translation,
        confidence: node.confidence || 1.0
      });
    }
    
    for (const [char, childNode] of node.children.entries()) {
      this.collectCompletions(childNode, currentPhrase + char, results, maxResults);
    }
  }

  /**
   * Get Trie size
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Clear the Trie
   */
  clear(): void {
    this.root = { children: new Map(), isEnd: false };
    this.size = 0;
  }
}

export const trieIndex = new TrieIndex();
